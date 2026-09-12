package com.solereax.inventory.inventory.dto;

import java.math.BigDecimal;
import java.time.Instant;

public record SalePromotionBadgeResponse(
        Long id,
        String code,
        String name,
        String discountType,
        BigDecimal discountValue,
        boolean buyOneTakeOne,
        Instant startsAt,
        Instant endsAt,
        boolean activeNow
) {
}

