package com.solereax.inventory.inventory.dto;

import java.math.BigDecimal;

public record ColorwayDetailsResponse(
        String description,
        String department,
        String category,
        String productType,
        BigDecimal price,
        BigDecimal minPrice,
        BigDecimal maxPrice
) {
}

