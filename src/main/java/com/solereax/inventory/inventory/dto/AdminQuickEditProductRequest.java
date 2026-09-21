package com.solereax.inventory.inventory.dto;

public record AdminQuickEditProductRequest(
    String name,
    String brand,
    String oldColorway,
    String newColorway
) {}

