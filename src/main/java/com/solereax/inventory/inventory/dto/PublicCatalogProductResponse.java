package com.solereax.inventory.inventory.dto;

import java.math.BigDecimal;

public record PublicCatalogProductResponse(
        Long id,
        String name,
        String brand,
        String description,
        String mainColor,
        String department,
        String category,
        String productType,
        String imageUrl,
        String primaryColorway,
        BigDecimal minPrice,
        BigDecimal maxPrice,
        Long viewCount
) {
}

