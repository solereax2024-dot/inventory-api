package com.solereax.inventory.inventory.dto;

public record SizeStockResponse(
        String colorway,
        String size,
        String sizeGroup,
        int quantity
) {
}
