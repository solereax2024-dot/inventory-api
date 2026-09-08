package com.solereax.inventory.inventory.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

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
        Map<String, String> colorwayImages,
        Map<String, ColorwayDetailsResponse> colorwayDetails,
        List<String> colorways,
        String primaryColorway,
        BigDecimal minPrice,
        BigDecimal maxPrice,
        Long viewCount,
        List<SalePromotionBadgeResponse> salePromotions
) {
}

