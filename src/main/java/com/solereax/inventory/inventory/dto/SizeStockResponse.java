package com.solereax.inventory.inventory.dto;

import java.math.BigDecimal;

public record SizeStockResponse(
        String colorway,
        String size,
        String sizeGroup,
        int quantity,
        BigDecimal price,
        String supplier
) {
}
