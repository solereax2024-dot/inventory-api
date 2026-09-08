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
        boolean lowStockOnly,
        String targetBrands,
        String targetCategories,
        String targetProductTypes,
        String targetProductIds,
        boolean buyOneTakeOne,
        Instant createdAt,
        Instant updatedAt
) {
}

