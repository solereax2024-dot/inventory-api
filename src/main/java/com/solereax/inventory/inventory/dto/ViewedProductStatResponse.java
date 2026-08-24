package com.solereax.inventory.inventory.dto;

public record ViewedProductStatResponse(
        Long productId,
        String name,
        String brand,
        Long uniqueViews
) {
}

