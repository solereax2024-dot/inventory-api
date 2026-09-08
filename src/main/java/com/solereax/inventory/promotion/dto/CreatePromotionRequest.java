package com.solereax.inventory.promotion.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;

public record CreatePromotionRequest(
        @NotBlank @Size(max = 40) String code,
        @NotBlank @Size(max = 120) String name,
        @Size(max = 500) String description,
        @NotBlank @Size(max = 20) String discountType,
        @NotNull BigDecimal discountValue,
        BigDecimal minOrderAmount,
        BigDecimal maxDiscountAmount,
        Integer usageLimit,
        Instant startsAt,
        Instant endsAt,
        Boolean active,
        Boolean lowStockOnly,
        String targetBrands,
        String targetCategories,
        String targetProductTypes,
        String targetProductIds,
        Boolean buyOneTakeOne
) {
}

