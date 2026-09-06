package com.solereax.inventory.promotion.dto;

import java.math.BigDecimal;
import java.time.Instant;

public record PromotionResponse(
        Long id,
        String code,
        String name,
        String description,
        String discountType,
        BigDecimal discountValue,
        BigDecimal minOrderAmount,
        BigDecimal maxDiscountAmount,
        Integer usageLimit,
        int usedCount,
        Instant startsAt,
        Instant endsAt,
        boolean active,
        Instant createdAt,
        Instant updatedAt
) {
}

