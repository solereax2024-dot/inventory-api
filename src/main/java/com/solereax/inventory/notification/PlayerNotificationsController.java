package com.solereax.inventory.notification;

import java.security.Principal;
import java.util.List;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/player-notifications")
public class PlayerNotificationsController {
    private final PlayerNotificationService playerNotificationService;

    public PlayerNotificationsController(PlayerNotificationService playerNotificationService) {
        this.playerNotificationService = playerNotificationService;
    }

    @GetMapping("/me")
    public ResponseEntity<List<PlayerNotificationResponse>> getMyNotifications(Principal principal) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(playerNotificationService.getNotificationsForUsername(principal.getName()));
    }

    @PatchMapping("/me/read-all")
    public ResponseEntity<PlayerNotificationReadResponse> markAllAsRead(Principal principal) {
        int updatedCount = playerNotificationService.markAllAsRead(principal.getName());
        return ResponseEntity.ok(new PlayerNotificationReadResponse("Notifications marked as read.", updatedCount));
    }
}

