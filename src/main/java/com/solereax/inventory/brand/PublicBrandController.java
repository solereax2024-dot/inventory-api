package com.solereax.inventory.brand;

import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/public/brands")
public class PublicBrandController {
    private final BrandService brandService;

    public PublicBrandController(BrandService brandService) {
        this.brandService = brandService;
    }

    @GetMapping
    public List<BrandService.BrandDto> listBrands() {
        return brandService.listBrands();
    }
}

