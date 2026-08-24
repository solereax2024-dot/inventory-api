package com.solereax.inventory.inventory.dto;

import java.util.List;

public record PublicViewStatsResponse(
        Long siteUniqueViews,
        List<ViewedProductStatResponse> topViewedProducts
) {
}

