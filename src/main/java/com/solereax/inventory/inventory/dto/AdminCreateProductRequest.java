package com.solereax.inventory.inventory.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.Map;

public record AdminCreateProductRequest(
        @NotBlank
        @Size(max = 150)
        String name,
        @Size(max = 100)
        String brand,
        @Size(max = 500)
        String description,
        @Size(max = 100)
        String mainColor,
        @Size(max = 30)
        String department,
        @Size(max = 30)
        String category,
        @Size(max = 50)
        String productType,
        @Size(max = 500)
        String imageUrl,
        BigDecimal price,
        Map<String, String> colorwayImages,
        Boolean active
) {
}
