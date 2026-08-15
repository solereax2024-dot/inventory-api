package com.solereax.inventory.settings;

import java.util.Map;
import java.util.HashMap;
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
    public Map<String, String> branding() {
        Map<String, String> response = new HashMap<>();
        response.put("logoUrl", brandingService.getLogoUrl());
        response.put("logoDarkUrl", brandingService.getLogoDarkUrl());
        return response;
    }
}
