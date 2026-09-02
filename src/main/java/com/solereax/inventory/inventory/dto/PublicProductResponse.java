package com.solereax.inventory.inventory.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public record PublicProductResponse(
        Long id,
        String name,
        String brand,
        String description,
        String mainColor,
        String department,
        String category,
        String productType,
        String imageUrl,
        BigDecimal price,
        Map<String, String> colorwayImages,
        Map<String, ColorwayDetailsResponse> colorwayDetails,
        List<SizeStockResponse> stocks,
        Long viewCount
) {
}
