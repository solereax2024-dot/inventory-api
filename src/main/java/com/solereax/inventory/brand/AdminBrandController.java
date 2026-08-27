package com.solereax.inventory.brand;

import com.solereax.inventory.settings.MediaStorageService;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/brands")
public class AdminBrandController {
    private final BrandService brandService;
    private final MediaStorageService mediaStorageService;

    public AdminBrandController(BrandService brandService, MediaStorageService mediaStorageService) {
        this.brandService = brandService;
        this.mediaStorageService = mediaStorageService;
    }

    @GetMapping
    public List<BrandService.BrandDto> listBrands() {
        return brandService.listBrands();
    }

    @PostMapping
    public BrandService.BrandDto createBrand(@RequestBody Map<String, String> body) {
        return brandService.createBrand(body.get("name"));
    }

    @PostMapping("/{id:\\d+}/logo")
    public BrandService.BrandDto uploadBrandLogo(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file) {
        String url = mediaStorageService.storeImage(file, "brands");
        return brandService.updateBrandLogo(id, url);
    }

    @DeleteMapping("/{id:\\d+}")
    public void deleteBrand(@PathVariable Long id) {
        brandService.deleteBrand(id);
    }

    @DeleteMapping("/by-name")
    public void deleteBrandByName(@RequestParam("name") String name) {
        brandService.deleteBrandByName(name);
    }
}
