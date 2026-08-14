package com.solereax.inventory.order.dto;

public record OrderItemResponse(
        Long productId,
        String productName,
        String colorway,
        String size,
        int quantity
) {
}
