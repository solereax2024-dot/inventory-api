package com.solereax.inventory.inventory.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record AdminAdjustStockRequest(
        @NotBlank
        String size,
        @NotBlank
        String colorway,
        @NotBlank
        String sizeGroup,
        @NotNull
        Integer quantityChange,
        BigDecimal price,
        BigDecimal markup,
        String referenceSupplier,
        String supplier,
        Boolean clearPrice,
        Boolean clearSupplier
) {
}
