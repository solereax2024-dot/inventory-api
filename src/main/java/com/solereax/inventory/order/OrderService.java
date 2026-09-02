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
import com.solereax.inventory.pricing.PricingPolicy;
import com.solereax.inventory.order.dto.OrderItemResponse;
import com.solereax.inventory.order.dto.OrderResponse;
import com.solereax.inventory.order.dto.ReserveOrderItemRequest;
import com.solereax.inventory.order.dto.ReserveOrderRequest;
import com.solereax.inventory.order.dto.UpdateOrderStatusRequest;
import com.solereax.inventory.shared.NotFoundException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.net.URLDecoder;
import java.net.URLEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OrderService {
    private static final Set<String> ALLOWED_COURIERS = Set.of("LALAMOVE", "GRAB", "LBC", "OTHER");
    private static final Set<String> ALLOWED_MOPS = Set.of("GCASH", "MAYA", "BPI", "MARIBANK", "OTHER");
    private static final String PREORDER_SUPPLIER_BREAKDOWN_MARKER = "__PREORDER__";

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
            int quantity = itemRequest.quantity();
            List<ProductStock> matchingStocks = productStockRepository.findAllForUpdate(
                    product.getId(),
                    colorway,
                    size,
                    stockSizeGroup.name()
            );
            int availableQuantity = matchingStocks.stream().mapToInt(ProductStock::getQuantity).sum();
            boolean isPreOrderOnly = availableQuantity == 0;
            if (!isPreOrderOnly && availableQuantity < quantity) {
                throw new IllegalArgumentException(
                        "Insufficient stock for " + product.getName() + " " + colorway + " size " + size
                );
            }

            CustomerOrderItem item = new CustomerOrderItem();
            item.setOrder(order);
            item.setProduct(product);
            item.setProductName(product.getName());
            item.setColorway(colorway);
            item.setSizeLabel(size);
            item.setSizeGroup(reservationSizeGroup);
            item.setQuantity(quantity);
            Map<String, Integer> supplierBreakdown = new LinkedHashMap<>();
            BigDecimal itemTotalPrice = BigDecimal.ZERO;

            if (isPreOrderOnly) {
                BigDecimal unitPrice = resolveReservedUnitPrice(product, matchingStocks.isEmpty() ? null : matchingStocks.getFirst(), colorway);
                if (unitPrice != null) {
                    itemTotalPrice = unitPrice.multiply(BigDecimal.valueOf(quantity));
                }
                item.setSupplierBreakdown(PREORDER_SUPPLIER_BREAKDOWN_MARKER);
                order.getItems().add(item);
                computedTotalPrice = computedTotalPrice.add(itemTotalPrice);
                continue;
            }

            int remaining = quantity;
            for (ProductStock stock : matchingStocks) {
                if (remaining <= 0) {
                    break;
                }
                if (stock.getQuantity() <= 0) {
                    continue;
                }

                int allocated = Math.min(stock.getQuantity(), remaining);
                stock.setQuantity(stock.getQuantity() - allocated);
                stock.setUpdatedAt(Instant.now());
                productStockRepository.save(stock);

                supplierBreakdown.merge(normalizeSupplierKey(stock.getSupplier()), allocated, Integer::sum);
                BigDecimal unitPrice = resolveReservedUnitPrice(product, stock, colorway);
                if (unitPrice != null) {
                    itemTotalPrice = itemTotalPrice.add(unitPrice.multiply(BigDecimal.valueOf(allocated)));
                }

                StockMovement movement = new StockMovement();
                movement.setProductStock(stock);
                movement.setQuantityChange(-allocated);
                movement.setReason("Reservation");
                movement.setChangedBy("customer:" + order.getCustomerName());
                stockMovementRepository.save(movement);

                remaining -= allocated;
            }

            if (remaining > 0) {
                throw new IllegalStateException(
                        "Unable to fully allocate stock for " + product.getName() + " " + colorway + " size " + size
                );
            }

            item.setSupplierBreakdown(serializeSupplierBreakdown(supplierBreakdown));
            order.getItems().add(item);
            computedTotalPrice = computedTotalPrice.add(itemTotalPrice);
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
            if (PREORDER_SUPPLIER_BREAKDOWN_MARKER.equals(trimToNull(item.getSupplierBreakdown()))) {
                continue;
            }
            Map<String, Integer> supplierBreakdown = parseSupplierBreakdown(item.getSupplierBreakdown());

            if (supplierBreakdown.isEmpty()) {
                ProductStock stock = findOrCreateStockForReservationRestore(product, colorway, size, stockSizeGroup, null);
                restoreSupplierStock(stock, item.getQuantity(), orderId, deletedBy);
                continue;
            }

            supplierBreakdown.forEach((supplierKey, restoredQuantity) -> {
                ProductStock stock = findOrCreateStockForReservationRestore(product, colorway, size, stockSizeGroup, denormalizeSupplierKey(supplierKey));
                restoreSupplierStock(stock, restoredQuantity, orderId, deletedBy);
            });
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
                        item.getQuantity(),
                        item.getSupplierBreakdown()
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
            String preferredSizeGroup,
            String supplier
    ) {
        if (supplier != null) {
            return productStockRepository.findForUpdateBySupplier(product.getId(), colorway, size, preferredSizeGroup, supplier)
                    .orElseGet(() -> {
                        ProductStock createdStock = new ProductStock();
                        createdStock.setProduct(product);
                        createdStock.setColorway(colorway);
                        createdStock.setSizeLabel(size);
                        createdStock.setSizeGroup(preferredSizeGroup);
                        createdStock.setQuantity(0);
                        createdStock.setSupplier(supplier);
                        createdStock.setPrice(resolveReservedUnitPrice(product, createdStock, colorway));
                        createdStock.setUpdatedAt(Instant.now());
                        return productStockRepository.save(createdStock);
                    });
        }

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
                    createdStock.setSupplier(null);
                    createdStock.setPrice(resolveReservedUnitPrice(product, createdStock, colorway));
                    createdStock.setUpdatedAt(Instant.now());
                    return productStockRepository.save(createdStock);
                });
    }

    private void restoreSupplierStock(ProductStock stock, int restoredQuantity, Long orderId, String deletedBy) {
        stock.setQuantity(stock.getQuantity() + restoredQuantity);
        stock.setUpdatedAt(Instant.now());
        productStockRepository.save(stock);

        StockMovement movement = new StockMovement();
        movement.setProductStock(stock);
        movement.setQuantityChange(restoredQuantity);
        movement.setReason("Reservation deleted #" + orderId);
        movement.setChangedBy(deletedBy);
        stockMovementRepository.save(movement);
    }

    private String serializeSupplierBreakdown(Map<String, Integer> supplierBreakdown) {
        if (supplierBreakdown == null || supplierBreakdown.isEmpty()) {
            return null;
        }
        return supplierBreakdown.entrySet().stream()
                .filter(entry -> entry.getValue() != null && entry.getValue() > 0)
                .map(entry -> encodeSupplierKey(entry.getKey()) + ":" + entry.getValue())
                .reduce((left, right) -> left + "|" + right)
                .orElse(null);
    }

    private Map<String, Integer> parseSupplierBreakdown(String rawSupplierBreakdown) {
        String normalized = trimToNull(rawSupplierBreakdown);
        if (normalized == null) {
            return Collections.emptyMap();
        }
        Map<String, Integer> sanitized = new LinkedHashMap<>();
        for (String entry : normalized.split("\\|")) {
            String trimmedEntry = entry.trim();
            if (trimmedEntry.isEmpty()) {
                continue;
            }
            int separatorIndex = trimmedEntry.lastIndexOf(':');
            if (separatorIndex <= 0 || separatorIndex >= trimmedEntry.length() - 1) {
                continue;
            }
            String supplierKey = decodeSupplierKey(trimmedEntry.substring(0, separatorIndex));
            int quantity;
            try {
                quantity = Integer.parseInt(trimmedEntry.substring(separatorIndex + 1));
            } catch (NumberFormatException ex) {
                continue;
            }
            if (quantity > 0) {
                sanitized.put(normalizeSupplierKey(denormalizeSupplierKey(supplierKey)), quantity);
            }
        }
        return sanitized;
    }

    private String normalizeSupplierKey(String supplier) {
        String normalized = trimToNull(supplier);
        return normalized == null ? "__NO_SUPPLIER__" : normalized;
    }

    private String denormalizeSupplierKey(String supplierKey) {
        return "__NO_SUPPLIER__".equals(supplierKey) ? null : trimToNull(supplierKey);
    }

    private String encodeSupplierKey(String supplierKey) {
        return URLEncoder.encode(supplierKey, StandardCharsets.UTF_8);
    }

    private String decodeSupplierKey(String supplierKey) {
        return URLDecoder.decode(supplierKey, StandardCharsets.UTF_8);
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
        BigDecimal supplierPrice;
        BigDecimal markup = stock == null ? null : stock.getMarkup();
        if (stock != null && stock.getPrice() != null) {
            supplierPrice = stock.getPrice();
            return PricingPolicy.toCustomerPrice(supplierPrice, markup);
        }
        BigDecimal colorwayPrice = product.getColorwayDetails().stream()
                .filter(entry -> normalizedColorway.equals(normalizeColorway(entry.getColorway())))
                .map(ProductColorwayDetail::getPrice)
                .filter(value -> value != null)
                .findFirst()
                .orElse(null);
        if (colorwayPrice != null) {
            supplierPrice = colorwayPrice;
            return PricingPolicy.toCustomerPrice(supplierPrice, markup);
        }
        BigDecimal defaultColorwayPrice = product.getColorwayDetails().stream()
                .filter(entry -> "DEFAULT".equals(normalizeColorway(entry.getColorway())))
                .map(ProductColorwayDetail::getPrice)
                .filter(value -> value != null)
                .findFirst()
                .orElse(null);
        supplierPrice = defaultColorwayPrice != null ? defaultColorwayPrice : product.getPrice();
        return PricingPolicy.toCustomerPrice(supplierPrice, markup);
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
