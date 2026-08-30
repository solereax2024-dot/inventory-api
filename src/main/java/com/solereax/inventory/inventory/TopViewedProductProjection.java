package com.solereax.inventory.inventory;

public interface TopViewedProductProjection {
    Long getProductId();

    String getColorwayKey();

    String getName();

    String getBrand();

    Long getViewCount();
}

