package com.solereax.inventory.promotion.dto;

import java.math.BigDecimal;

public record PromotionValidationResponse(
        boolean valid,
        String code,
        String name,
        String description,
        String discountType,
        BigDecimal discountAmount,
        BigDecimal totalAfterDiscount,
        String message
) {
}

