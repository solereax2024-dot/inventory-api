package com.solereax.inventory.inventory;

import com.solereax.inventory.inventory.dto.PublicProductResponse;
import java.util.List;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/public/products")
public class PublicInventoryController {
    private final InventoryService inventoryService;

    public PublicInventoryController(InventoryService inventoryService) {
        this.inventoryService = inventoryService;
    }

    @GetMapping
    public List<PublicProductResponse> listProducts() {
        return inventoryService.listPublicProducts();
    }

    @GetMapping("/by-ids")
    public List<PublicProductResponse> listProductsByIds(@RequestParam("ids") List<Long> ids) {
        return inventoryService.listPublicProductsByIds(ids);
    }

    @GetMapping("/{id}")
    public PublicProductResponse getProduct(@PathVariable Long id) {
        return inventoryService.getPublicProduct(id);
    }
}
