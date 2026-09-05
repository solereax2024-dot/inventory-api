package com.solereax.inventory.settings;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/public/settings")
public class PublicSettingsController {
    private final BrandingService brandingService;

    public PublicSettingsController(BrandingService brandingService) {
        this.brandingService = brandingService;
    }

    @GetMapping("/branding")
    public ResponseEntity<Map<String, String>> branding() {
        Map<String, String> response = new HashMap<>();
        response.put("logoUrl", brandingService.getLogoUrl());
        response.put("logoDarkUrl", brandingService.getLogoDarkUrl());
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(1, TimeUnit.HOURS).cachePublic())
                .body(response);
    }
}
