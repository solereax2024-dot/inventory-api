package com.solereax.inventory.inventory;

public interface TopViewedProductProjection {
    Long getProductId();

    String getName();

    String getBrand();

    Long getViewCount();
}

