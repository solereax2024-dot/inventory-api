package com.solereax.inventory.settings;

import java.util.HashMap;
import java.util.Map;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/public/settings")
public class PublicSettingsController {
    private final BrandingService brandingService;
    private final GamingService gamingService;
    private final GiveawaySettingsService giveawaySettingsService;

    public PublicSettingsController(BrandingService brandingService, GamingService gamingService, GiveawaySettingsService giveawaySettingsService) {
        this.brandingService = brandingService;
        this.gamingService = gamingService;
        this.giveawaySettingsService = giveawaySettingsService;
    }

    @GetMapping("/branding")
    public ResponseEntity<Map<String, Object>> branding() {
        Map<String, Object> response = new HashMap<>();
        response.put("logoUrl", brandingService.getLogoUrl());
        response.put("logoDarkUrl", brandingService.getLogoDarkUrl());
        response.put("gamingSectionVisible", gamingService.isGamingSectionVisible());
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(response);
    }

    @GetMapping("/giveaway")
    public ResponseEntity<GiveawaySettingsResponse> giveaway() {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(giveawaySettingsService.getSettings());
    }
}
