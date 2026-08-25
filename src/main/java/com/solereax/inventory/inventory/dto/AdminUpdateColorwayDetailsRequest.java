package com.solereax.inventory.inventory.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record AdminUpdateColorwayDetailsRequest(
        @NotBlank
        @Size(max = 80)
        String colorway,
        @Size(max = 500)
        String description,
        @Size(max = 30)
        String department,
        @Size(max = 30)
        String category,
        @Size(max = 50)
        String productType,
        BigDecimal price
) {
}

