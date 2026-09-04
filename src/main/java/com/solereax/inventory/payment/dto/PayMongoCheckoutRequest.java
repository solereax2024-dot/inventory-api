package com.solereax.inventory.payment.dto;

import jakarta.validation.constraints.NotNull;

public record PayMongoCheckoutRequest(
        @NotNull Long orderId,
        String successUrl,
        String cancelUrl
) {
}

