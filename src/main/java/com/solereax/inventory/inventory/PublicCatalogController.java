package com.solereax.inventory.inventory;

import com.solereax.inventory.inventory.dto.PublicCatalogFacetResponse;
import com.solereax.inventory.inventory.dto.PublicCatalogPageResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/public/catalog")
public class PublicCatalogController {
    private final InventoryService inventoryService;

    public PublicCatalogController(InventoryService inventoryService) {
        this.inventoryService = inventoryService;
    }

    @GetMapping
    public PublicCatalogPageResponse listCatalog(
            @RequestParam(name = "brand", required = false) String brand,
            @RequestParam(name = "department", required = false) String department,
            @RequestParam(name = "category", required = false) String category,
            @RequestParam(name = "productType", required = false) String productType,
            @RequestParam(name = "colorway", required = false) String colorway,
            @RequestParam(name = "sizeFilter", required = false) String sizeFilter,
            @RequestParam(name = "stock", required = false) String stock,
            @RequestParam(name = "q", required = false) String search,
            @RequestParam(name = "sort", required = false) String sort,
            @RequestParam(name = "page", defaultValue = "1") int page,
            @RequestParam(name = "pageSize", defaultValue = "16") int pageSize
    ) {
        return inventoryService.listPublicCatalog(
                brand,
                department,
                category,
                productType,
                colorway,
                sizeFilter,
                stock,
                search,
                sort,
                page,
                pageSize
        );
    }

    @GetMapping("/facets")
    public PublicCatalogFacetResponse facets() {
        return inventoryService.getPublicCatalogFacets();
    }
}
