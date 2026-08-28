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
import java.math.BigDecimal;
import java.math.RoundingMode;
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
        BigDecimal computedTotalPrice = BigDecimal.ZERO;

        for (ReserveOrderItemRequest itemRequest : request.items()) {
            Product product = productRepository.findById(itemRequest.productId())
                    .orElseThrow(() -> new NotFoundException("Product not found: " + itemRequest.productId()));
            if (!product.isActive()) {
                throw new IllegalArgumentException("Product is not active: " + product.getName());
            }

            String size = UsSizeStandard.normalizeAndValidate(itemRequest.size());
            String colorway = ColorwayStandard.normalizeAndValidate(itemRequest.colorway());
            String department = resolveDepartmentForColorway(product, colorway);
            StockSizeGroup stockSizeGroup = StockSizeGroup.forDepartment(department, itemRequest.sizeGroup());
            String reservationSizeGroup = resolveReservationSizeGroup(department, itemRequest.sizeGroup());
            ProductStock stock = productStockRepository.findForUpdate(product.getId(), colorway, size, stockSizeGroup.name())
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
            item.setSizeGroup(reservationSizeGroup);
            item.setQuantity(quantity);
            order.getItems().add(item);

            BigDecimal unitPrice = resolveReservedUnitPrice(product, stock, colorway);
            if (unitPrice != null) {
                computedTotalPrice = computedTotalPrice.add(unitPrice.multiply(BigDecimal.valueOf(quantity)));
            }

            StockMovement movement = new StockMovement();
            movement.setProductStock(stock);
            movement.setQuantityChange(-quantity);
            movement.setReason("Reservation");
            movement.setChangedBy("customer:" + order.getCustomerName());
            stockMovementRepository.save(movement);
        }

        if (computedTotalPrice.compareTo(BigDecimal.ZERO) > 0) {
            order.setTotalPrice(computedTotalPrice.setScale(2, RoundingMode.HALF_UP));
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
        if (request.totalPrice() != null) {
            BigDecimal totalPrice = request.totalPrice().setScale(2, RoundingMode.HALF_UP);
            if (totalPrice.compareTo(BigDecimal.ZERO) < 0) {
                throw new IllegalArgumentException("Price must be 0 or higher.");
            }
            order.setTotalPrice(totalPrice);
        }
        if (request.downpayment() != null) {
            BigDecimal downpayment = request.downpayment().setScale(2, RoundingMode.HALF_UP);
            if (downpayment.compareTo(BigDecimal.ZERO) < 0) {
                throw new IllegalArgumentException("Downpayment must be 0 or higher.");
            }
            order.setDownpayment(downpayment);
        }
        if (request.balance() != null) {
            BigDecimal balance = request.balance().setScale(2, RoundingMode.HALF_UP);
            if (balance.compareTo(BigDecimal.ZERO) < 0) {
                throw new IllegalArgumentException("Balance must be 0 or higher.");
            }
            order.setBalance(balance);
        }
        order.setStatusUpdatedBy(updatedBy);
        return toResponse(customerOrderRepository.save(order));
    }

    @Transactional
    public void deleteOrder(Long orderId, String deletedBy) {
        CustomerOrder order = customerOrderRepository.findByIdWithItems(orderId)
                .orElseThrow(() -> new NotFoundException("Order not found: " + orderId));

        for (CustomerOrderItem item : order.getItems()) {
            Product product = item.getProduct();
            String size = UsSizeStandard.normalizeAndValidate(item.getSizeLabel());
            String colorway = normalizeColorway(item.getColorway());
            String department = resolveDepartmentForColorway(product, colorway);
            String stockSizeGroup = StockSizeGroup.forDepartment(department, item.getSizeGroup()).name();
            ProductStock stock = findOrCreateStockForReservationRestore(product, colorway, size, stockSizeGroup);

            stock.setQuantity(stock.getQuantity() + item.getQuantity());
            stock.setUpdatedAt(Instant.now());
            productStockRepository.save(stock);

            StockMovement movement = new StockMovement();
            movement.setProductStock(stock);
            movement.setQuantityChange(item.getQuantity());
            movement.setReason("Reservation deleted #" + orderId);
            movement.setChangedBy(deletedBy);
            stockMovementRepository.save(movement);
        }

        customerOrderRepository.delete(order);
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
                order.getTotalPrice(),
                order.getDownpayment(),
                order.getBalance(),
                order.getStatusUpdatedBy(),
                order.getCreatedAt(),
                items
        );
    }

    private String normalizeChoice(String value) {
        String normalized = trimToNull(value);
        return normalized == null ? null : normalized.toUpperCase(Locale.ROOT);
    }

    private ProductStock findOrCreateStockForReservationRestore(
            Product product,
            String colorway,
            String size,
            String preferredSizeGroup
    ) {
        return productStockRepository.findForUpdate(product.getId(), colorway, size, preferredSizeGroup)
                .orElseGet(() -> {
                    List<ProductStock> matchingStocks = productStockRepository.findAllByProductIdAndColorwayAndSizeLabel(
                            product.getId(),
                            colorway,
                            size
                    );
                    if (matchingStocks.size() == 1) {
                        String matchedGroup = matchingStocks.get(0).getSizeGroup();
                        return productStockRepository.findForUpdate(product.getId(), colorway, size, matchedGroup)
                                .orElse(matchingStocks.get(0));
                    }
                    if (matchingStocks.size() > 1) {
                        throw new IllegalArgumentException(
                                "Unable to restore stock for " + product.getName() + " " + colorway + " size " + size
                                        + " because multiple stock groups match this reservation item."
                        );
                    }

                    ProductStock createdStock = new ProductStock();
                    createdStock.setProduct(product);
                    createdStock.setColorway(colorway);
                    createdStock.setSizeLabel(size);
                    createdStock.setSizeGroup(preferredSizeGroup);
                    createdStock.setQuantity(0);
                    createdStock.setPrice(resolveReservedUnitPrice(product, createdStock, colorway));
                    createdStock.setUpdatedAt(Instant.now());
                    return productStockRepository.save(createdStock);
                });
    }

    private String resolveReservationSizeGroup(String department, String requestedGroup) {
        String normalizedDepartment = normalizeChoice(department);
        if ("UNISEX".equals(normalizedDepartment)) {
            return "WOMEN".equalsIgnoreCase(requestedGroup) ? "WOMEN" : "MEN";
        }
        if ("WOMEN".equals(normalizedDepartment)) {
            return "WOMEN";
        }
        if ("KIDS".equals(normalizedDepartment)) {
            return "KIDS";
        }
        if ("MEN".equals(normalizedDepartment)) {
            return "MEN";
        }
        return normalizeChoice(requestedGroup) != null ? normalizeChoice(requestedGroup) : StockSizeGroup.STANDARD.name();
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

    private BigDecimal resolveReservedUnitPrice(Product product, ProductStock stock, String normalizedColorway) {
        if (stock.getPrice() != null) {
            return stock.getPrice();
        }
        BigDecimal colorwayPrice = product.getColorwayDetails().stream()
                .filter(entry -> normalizedColorway.equals(normalizeColorway(entry.getColorway())))
                .map(ProductColorwayDetail::getPrice)
                .filter(value -> value != null)
                .findFirst()
                .orElse(null);
        if (colorwayPrice != null) {
            return colorwayPrice;
        }
        BigDecimal defaultColorwayPrice = product.getColorwayDetails().stream()
                .filter(entry -> "DEFAULT".equals(normalizeColorway(entry.getColorway())))
                .map(ProductColorwayDetail::getPrice)
                .filter(value -> value != null)
                .findFirst()
                .orElse(null);
        return defaultColorwayPrice != null ? defaultColorwayPrice : product.getPrice();
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
