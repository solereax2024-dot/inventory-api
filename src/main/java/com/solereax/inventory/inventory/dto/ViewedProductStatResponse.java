package com.solereax.inventory.inventory.dto;

public record ViewedProductStatResponse(
        Long productId,
        String colorwayKey,
        String name,
        String brand,
        Long uniqueViews
) {
}

