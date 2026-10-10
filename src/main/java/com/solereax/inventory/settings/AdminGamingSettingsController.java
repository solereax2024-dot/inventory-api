package com.solereax.inventory.settings;

import com.solereax.inventory.tetris.GiveawayBonusService;
import com.solereax.inventory.tetris.GiveawayBonusStatusResponse;
import com.solereax.inventory.user.dto.RegisteredPlayerResponse;
import java.util.HashMap;
import java.util.Map;
import java.util.List;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/api/admin/settings/gaming", "/api/admin/settings"})
public class AdminGamingSettingsController {
    private final GamingService gamingService;
    private final GiveawayBonusService giveawayBonusService;
    private final GiveawaySettingsService giveawaySettingsService;

    public AdminGamingSettingsController(GamingService gamingService, GiveawayBonusService giveawayBonusService, GiveawaySettingsService giveawaySettingsService) {
        this.gamingService = gamingService;
        this.giveawayBonusService = giveawayBonusService;
        this.giveawaySettingsService = giveawaySettingsService;
    }

    @GetMapping
    public ResponseEntity<Map<String, Boolean>> getGamingSettings() {
        Map<String, Boolean> response = new HashMap<>();
        response.put("gamingSectionVisible", gamingService.isGamingSectionVisible());
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(response);
    }

    @GetMapping("/players")
    public ResponseEntity<List<RegisteredPlayerResponse>> listRegisteredPlayers() {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(gamingService.listRegisteredPlayers());
    }

    @GetMapping("/giveaway")
    public ResponseEntity<GiveawaySettingsResponse> getGiveawaySettings() {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(giveawaySettingsService.getSettings());
    }

    @GetMapping("/giveaway-settings")
    public ResponseEntity<GiveawaySettingsResponse> getGiveawaySettingsAlias() {
        return getGiveawaySettings();
    }

    @PutMapping("/giveaway")
    public ResponseEntity<GiveawaySettingsResponse> updateGiveawaySettings(@RequestBody GiveawaySettingsUpdateRequest request) {
        return ResponseEntity.ok(giveawaySettingsService.updateSettings(request));
    }

    @PutMapping("/giveaway-settings")
    public ResponseEntity<GiveawaySettingsResponse> updateGiveawaySettingsAlias(@RequestBody GiveawaySettingsUpdateRequest request) {
        return updateGiveawaySettings(request);
    }

    @PatchMapping("/bonuses/{userId}/{bonusType}/validate")
    public ResponseEntity<GiveawayBonusStatusResponse> validateBonusProof(
            @PathVariable Long userId,
            @PathVariable String bonusType
    ) {
        return ResponseEntity.ok(giveawayBonusService.validateProof(userId, bonusType));
    }

    @PatchMapping("/bonuses/{userId}/{bonusType}/revoke")
    public ResponseEntity<GiveawayBonusStatusResponse> revokeBonusProof(
            @PathVariable Long userId,
            @PathVariable String bonusType
    ) {
        return ResponseEntity.ok(giveawayBonusService.revokeProof(userId, bonusType));
    }

    @PutMapping
    public ResponseEntity<Map<String, Boolean>> updateGamingSettings(@RequestBody Map<String, Object> body) {
        Object rawValue = body != null ? body.get("gamingSectionVisible") : null;
        boolean visible = rawValue == null || (rawValue instanceof Boolean ? (Boolean) rawValue : Boolean.parseBoolean(String.valueOf(rawValue)));
        Map<String, Boolean> response = new HashMap<>();
        response.put("gamingSectionVisible", gamingService.updateGamingSectionVisible(visible));
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/players/{userId}")
    public ResponseEntity<Map<String, String>> deletePlayer(@PathVariable Long userId) {
        gamingService.deletePlayer(userId);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Player deleted successfully");
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/players")
    public ResponseEntity<Map<String, String>> deleteAllPlayers() {
        gamingService.deleteAllPlayers();
        Map<String, String> response = new HashMap<>();
        response.put("message", "All players deleted successfully");
        return ResponseEntity.ok(response);
    }
}

