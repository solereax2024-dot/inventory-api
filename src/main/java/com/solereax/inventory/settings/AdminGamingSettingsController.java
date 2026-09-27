package com.solereax.inventory.settings;

import java.util.HashMap;
import java.util.Map;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/settings/gaming")
public class AdminGamingSettingsController {
    private final GamingService gamingService;

    public AdminGamingSettingsController(GamingService gamingService) {
        this.gamingService = gamingService;
    }

    @GetMapping
    public ResponseEntity<Map<String, Boolean>> getGamingSettings() {
        Map<String, Boolean> response = new HashMap<>();
        response.put("gamingSectionVisible", gamingService.isGamingSectionVisible());
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(response);
    }

    @PutMapping
    public ResponseEntity<Map<String, Boolean>> updateGamingSettings(@RequestBody Map<String, Object> body) {
        Object rawValue = body != null ? body.get("gamingSectionVisible") : null;
        boolean visible = rawValue == null || (rawValue instanceof Boolean ? (Boolean) rawValue : Boolean.parseBoolean(String.valueOf(rawValue)));
        Map<String, Boolean> response = new HashMap<>();
        response.put("gamingSectionVisible", gamingService.updateGamingSectionVisible(visible));
        return ResponseEntity.ok(response);
    }
}

