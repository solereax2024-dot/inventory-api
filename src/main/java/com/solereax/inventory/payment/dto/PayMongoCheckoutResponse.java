package com.solereax.inventory.payment.dto;

public record PayMongoCheckoutResponse(
        Long orderId,
        String checkoutId,
        String checkoutUrl,
        String paymentStatus
) {
}

