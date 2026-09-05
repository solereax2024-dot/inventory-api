package com.solereax.inventory.inventory.dto;

import java.util.List;

public record PublicCatalogPageResponse(
        List<PublicCatalogProductResponse> items,
        long totalElements,
        int page,
        int pageSize
) {
    public int totalPages() {
        if (pageSize <= 0) {
            return 0;
        }
        return (int) Math.ceil((double) totalElements / (double) pageSize);
    }
}
