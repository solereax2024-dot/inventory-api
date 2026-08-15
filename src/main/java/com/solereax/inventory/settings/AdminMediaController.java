package com.solereax.inventory.settings;

import java.util.Map;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/admin/media")
public class AdminMediaController {
    private final MediaStorageService mediaStorageService;
    private final BrandingService brandingService;

    public AdminMediaController(MediaStorageService mediaStorageService, BrandingService brandingService) {
        this.mediaStorageService = mediaStorageService;
        this.brandingService = brandingService;
    }

    @PostMapping("/product-image")
    public Map<String, String> uploadProductImage(@RequestParam("file") MultipartFile file) {
        String url = mediaStorageService.storeImage(file, "products");
        return Map.of("url", url);
    }

    @PostMapping("/logo")
    public Map<String, String> uploadLogo(@RequestParam("file") MultipartFile file) {
        String url = mediaStorageService.storeImage(file, "branding");
        brandingService.updateLogoUrl(url);
        return Map.of("url", url);
    }

    @PostMapping("/logo-dark")
    public Map<String, String> uploadLogoDark(@RequestParam("file") MultipartFile file) {
        String url = mediaStorageService.storeImage(file, "branding");
        brandingService.updateLogoDarkUrl(url);
        return Map.of("url", url);
    }
}
