package com.solereax.inventory.inventory.dto;

import java.math.BigDecimal;

public record SalePromotionBadgeResponse(
        Long id,
        String code,
        String name,
        String discountType,
        BigDecimal discountValue,
        boolean buyOneTakeOne
) {
}

