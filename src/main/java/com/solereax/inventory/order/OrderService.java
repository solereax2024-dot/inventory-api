package com.solereax.inventory.order;

import com.solereax.inventory.inventory.Product;
import com.solereax.inventory.inventory.ProductRepository;
import com.solereax.inventory.inventory.ProductStock;
import com.solereax.inventory.inventory.ProductStockRepository;
import com.solereax.inventory.inventory.ProductColorwayDetail;
import com.solereax.inventory.inventory.StockSizeGroup;
import com.solereax.inventory.inventory.StockMovement;
import com.solereax.inventory.inventory.StockMovementRepository;
import com.solereax.inventory.inventory.UsSizeStandard;
import com.solereax.inventory.inventory.ColorwayStandard;
import com.solereax.inventory.order.dto.OrderItemResponse;
import com.solereax.inventory.order.dto.OrderResponse;
import com.solereax.inventory.order.dto.ReserveOrderItemRequest;
import com.solereax.inventory.order.dto.ReserveOrderRequest;
import com.solereax.inventory.order.dto.UpdateOrderStatusRequest;
import com.solereax.inventory.shared.NotFoundException;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.Locale;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OrderService {
    private static final Set<String> ALLOWED_COURIERS = Set.of("LALAMOVE", "GRAB", "LBC", "OTHER");
    private static final Set<String> ALLOWED_MOPS = Set.of("GCASH", "MAYA", "BPI", "MARIBANK", "OTHER");

    private final CustomerOrderRepository customerOrderRepository;
    private final ProductRepository productRepository;
    private final ProductStockRepository productStockRepository;
    private final StockMovementRepository stockMovementRepository;

    public OrderService(
            CustomerOrderRepository customerOrderRepository,
            ProductRepository productRepository,
            ProductStockRepository productStockRepository,
            StockMovementRepository stockMovementRepository
    ) {
        this.customerOrderRepository = customerOrderRepository;
        this.productRepository = productRepository;
        this.productStockRepository = productStockRepository;
        this.stockMovementRepository = stockMovementRepository;
    }

    @Transactional
    public OrderResponse reserveOrder(ReserveOrderRequest request) {
        CustomerOrder order = new CustomerOrder();
        order.setCustomerName(request.customerName().trim());
        order.setCustomerContact(request.customerContact().trim());
        order.setNotes(trimToNull(request.notes()));
        order.setStatus(OrderStatus.ORDERED);
        order.setStatusUpdatedBy("customer:" + order.getCustomerName());

        for (ReserveOrderItemRequest itemRequest : request.items()) {
            Product product = productRepository.findById(itemRequest.productId())
                    .orElseThrow(() -> new NotFoundException("Product not found: " + itemRequest.productId()));
            if (!product.isActive()) {
                throw new IllegalArgumentException("Product is not active: " + product.getName());
            }

            String size = UsSizeStandard.normalizeAndValidate(itemRequest.size());
            String colorway = ColorwayStandard.normalizeAndValidate(itemRequest.colorway());
            StockSizeGroup sizeGroup = StockSizeGroup.forDepartment(resolveDepartmentForColorway(product, colorway), itemRequest.sizeGroup());
            ProductStock stock = productStockRepository.findForUpdate(product.getId(), colorway, size, sizeGroup.name())
                    .orElseThrow(() -> new IllegalArgumentException(
                            "Colorway " + colorway + " size " + size + " is not available for " + product.getName()));

            int quantity = itemRequest.quantity();
            if (stock.getQuantity() < quantity) {
                throw new IllegalArgumentException(
                        "Insufficient stock for " + product.getName() + " " + colorway + " size " + size
                );
            }

            stock.setQuantity(stock.getQuantity() - quantity);
            stock.setUpdatedAt(Instant.now());
            productStockRepository.save(stock);

            CustomerOrderItem item = new CustomerOrderItem();
            item.setOrder(order);
            item.setProduct(product);
            item.setProductName(product.getName());
            item.setColorway(colorway);
            item.setSizeLabel(size);
            item.setSizeGroup(sizeGroup.name());
            item.setQuantity(quantity);
            order.getItems().add(item);

            StockMovement movement = new StockMovement();
            movement.setProductStock(stock);
            movement.setQuantityChange(-quantity);
            movement.setReason("Reservation");
            movement.setChangedBy("customer:" + order.getCustomerName());
            stockMovementRepository.save(movement);
        }

        CustomerOrder savedOrder = customerOrderRepository.save(order);
        return toResponse(savedOrder);
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> listOrders() {
        return customerOrderRepository.findAllWithItems()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public OrderResponse updateOrderStatus(Long orderId, UpdateOrderStatusRequest request, String updatedBy) {
        CustomerOrder order = customerOrderRepository.findByIdWithItems(orderId)
                .orElseThrow(() -> new NotFoundException("Order not found: " + orderId));
        if (trimToNull(request.status()) != null) {
            OrderStatus nextStatus = parseStatus(request.status());
            order.setStatus(nextStatus);
        }
        if (request.courier() != null) {
            String courier = normalizeChoice(request.courier());
            if (courier != null && !ALLOWED_COURIERS.contains(courier)) {
                throw new IllegalArgumentException("Invalid courier: " + request.courier());
            }
            order.setCourier(courier);
        }

        if (request.mop() != null) {
            String mop = normalizeChoice(request.mop());
            if (mop != null && !ALLOWED_MOPS.contains(mop)) {
                throw new IllegalArgumentException("Invalid payment method: " + request.mop());
            }
            order.setMop(mop);

            String mopOther = trimToNull(request.mopOther());
            if ("OTHER".equals(mop)) {
                order.setMopOther(mopOther);
            } else {
                order.setMopOther(null);
            }
        } else if (request.mopOther() != null && "OTHER".equals(order.getMop())) {
            order.setMopOther(trimToNull(request.mopOther()));
        }
        order.setStatusUpdatedBy(updatedBy);
        return toResponse(customerOrderRepository.save(order));
    }

    private OrderResponse toResponse(CustomerOrder order) {
        List<OrderItemResponse> items = order.getItems().stream()
                .map(item -> new OrderItemResponse(
                        item.getProduct().getId(),
                        item.getProductName(),
                        item.getColorway(),
                        item.getSizeLabel(),
                        item.getSizeGroup(),
                        item.getQuantity()
                ))
                .toList();
        return new OrderResponse(
                order.getId(),
                order.getCustomerName(),
                order.getCustomerContact(),
                order.getNotes(),
                order.getStatus().name(),
                order.getCourier(),
                order.getMop(),
                order.getMopOther(),
                order.getStatusUpdatedBy(),
                order.getCreatedAt(),
                items
        );
    }

    private String normalizeChoice(String value) {
        String normalized = trimToNull(value);
        return normalized == null ? null : normalized.toUpperCase(Locale.ROOT);
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String resolveDepartmentForColorway(Product product, String normalizedColorway) {
        String fallbackDepartment = trimToNull(product.getDepartment());
        String exactDepartment = product.getColorwayDetails().stream()
                .filter(entry -> normalizedColorway.equals(normalizeColorway(entry.getColorway())))
                .map(ProductColorwayDetail::getDepartment)
                .map(this::trimToNull)
                .filter(value -> value != null)
                .findFirst()
                .orElse(null);
        if (exactDepartment != null) {
            return exactDepartment;
        }
        return product.getColorwayDetails().stream()
                .filter(entry -> "DEFAULT".equals(normalizeColorway(entry.getColorway())))
                .map(ProductColorwayDetail::getDepartment)
                .map(this::trimToNull)
                .filter(value -> value != null)
                .findFirst()
                .orElse(fallbackDepartment);
    }

    private String normalizeColorway(String value) {
        if (value == null || value.trim().isEmpty() || "DEFAULT".equalsIgnoreCase(value)) {
            return "DEFAULT";
        }
        return ColorwayStandard.normalizeAndValidate(value);
    }

    private OrderStatus parseStatus(String rawStatus) {
        if (rawStatus == null) {
            throw new IllegalArgumentException("Order status is required.");
        }
        String normalized = rawStatus.trim().toUpperCase();
        try {
            OrderStatus parsed = OrderStatus.valueOf(normalized);
            return parsed == OrderStatus.RESERVED ? OrderStatus.ORDERED : parsed;
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Invalid order status: " + rawStatus);
        }
    }
}
