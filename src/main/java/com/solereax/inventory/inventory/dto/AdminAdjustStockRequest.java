package com.solereax.inventory.inventory.dto;

import com.solereax.inventory.inventory.StockSourceType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record AdminAdjustStockRequest(
        @NotBlank
        String size,
        @NotBlank
        String colorway,
        @NotNull
        Integer quantityChange,
        @NotNull
        StockSourceType stockSourceType
) {
}
