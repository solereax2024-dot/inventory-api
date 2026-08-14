package com.solereax.inventory.inventory.dto;

public record SizeStockResponse(
        String colorway,
        String size,
        int quantity
) {
}
