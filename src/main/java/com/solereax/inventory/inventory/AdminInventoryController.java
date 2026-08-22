package com.solereax.inventory.inventory;

import com.solereax.inventory.inventory.dto.AdminAdjustStockRequest;
import com.solereax.inventory.inventory.dto.AdminCreateProductRequest;
import com.solereax.inventory.inventory.dto.AdminUpdateColorwayDetailsRequest;
import com.solereax.inventory.inventory.dto.AdminUpdateColorwayImageRequest;
import com.solereax.inventory.inventory.dto.PublicProductResponse;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/products")
public class AdminInventoryController {
    private final InventoryService inventoryService;

    public AdminInventoryController(InventoryService inventoryService) {
        this.inventoryService = inventoryService;
    }

    @GetMapping
    public List<PublicProductResponse> listProducts() {
        return inventoryService.listAdminProducts();
    }

    @PostMapping
    public PublicProductResponse createProduct(@Valid @RequestBody AdminCreateProductRequest request) {
        return inventoryService.createProduct(request);
    }

    @PutMapping("/{productId}")
    public PublicProductResponse updateProduct(
            @PathVariable Long productId,
            @Valid @RequestBody AdminCreateProductRequest request
    ) {
        return inventoryService.updateProduct(productId, request);
    }

    @PutMapping("/{productId}/colorway-image")
    public PublicProductResponse updateColorwayImage(
            @PathVariable Long productId,
            @Valid @RequestBody AdminUpdateColorwayImageRequest request
    ) {
        return inventoryService.updateProductColorwayImage(productId, request.colorway(), request.imageUrl());
    }

    @PutMapping("/{productId}/colorway-details")
    public PublicProductResponse updateColorwayDetails(
            @PathVariable Long productId,
            @Valid @RequestBody AdminUpdateColorwayDetailsRequest request
    ) {
        return inventoryService.updateProductColorwayDetails(productId, request);
    }

    @DeleteMapping("/{productId}/colorways/{colorway}")
    public PublicProductResponse deleteColorway(
            @PathVariable Long productId,
            @PathVariable String colorway
    ) {
        return inventoryService.deleteProductColorway(productId, colorway);
    }

    @PostMapping("/{productId}/stocks")
    public PublicProductResponse adjustStock(
            @PathVariable Long productId,
            @Valid @RequestBody AdminAdjustStockRequest request,
            Authentication authentication
    ) {
        return inventoryService.adjustStock(productId, request, authentication.getName());
    }

    @DeleteMapping("/{productId}")
    public void deleteProduct(@PathVariable Long productId) {
        inventoryService.deleteProduct(productId);
    }
}
