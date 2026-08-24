package com.solereax.inventory.order.dto;

import java.time.Instant;
import java.math.BigDecimal;
import java.util.List;

public record OrderResponse(
        Long id,
        String customerName,
        String customerContact,
        String notes,
        String status,
        String courier,
        String mop,
        String mopOther,
        BigDecimal totalPrice,
        String statusUpdatedBy,
        Instant createdAt,
        List<OrderItemResponse> items
) {
}
