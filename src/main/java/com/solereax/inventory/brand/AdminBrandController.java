package com.solereax.inventory.brand;

import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/brands")
public class AdminBrandController {
    private final BrandService brandService;

    public AdminBrandController(BrandService brandService) {
        this.brandService = brandService;
    }

    @GetMapping
    public List<String> listBrands() {
        return brandService.listBrandNames();
    }

    @PostMapping
    public Map<String, String> createBrand(@RequestBody Map<String, String> body) {
        String name = brandService.createBrand(body.get("name"));
        return Map.of("name", name);
    }

    @DeleteMapping("/{id}")
    public void deleteBrand(@PathVariable Long id) {
        brandService.deleteBrand(id);
    }
}
