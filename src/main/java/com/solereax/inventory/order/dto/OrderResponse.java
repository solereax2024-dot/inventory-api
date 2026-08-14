package com.solereax.inventory.order.dto;

import java.time.Instant;
import java.util.List;

public record OrderResponse(
        Long id,
        String customerName,
        String customerContact,
        String notes,
        String status,
        String statusUpdatedBy,
        Instant createdAt,
        List<OrderItemResponse> items
) {
}
