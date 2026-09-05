package com.solereax.inventory.inventory.dto;

import java.util.List;

public record PublicCatalogFacetResponse(
        List<String> brands,
        List<String> departments,
        List<String> categories,
        List<String> productTypes,
        List<String> colorways
) {
}
