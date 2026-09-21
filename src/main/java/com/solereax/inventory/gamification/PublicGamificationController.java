package com.solereax.inventory.gamification;

import com.solereax.inventory.gamification.dto.CustomerProfileDTO;
import com.solereax.inventory.gamification.dto.SpinWheelResultDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Public APIs for gamification (badges, points, spin wheel)
 */
@RestController
@RequestMapping("/api/public/gamification")
@RequiredArgsConstructor
public class PublicGamificationController {
    private final GamificationService gamificationService;

    /**
     * Set/Create username (with unique validation)
     * POST /api/public/gamification/set-username?username=john_doe
     */
    @PostMapping("/set-username")
    public ResponseEntity<?> setUsername(@RequestParam String username) {
        if (username == null || username.trim().isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(java.util.Map.of("error", "Username cannot be empty"));
        }
        if (username.length() < 3 || username.length() > 30) {
            return ResponseEntity.badRequest()
                    .body(java.util.Map.of("error", "Username must be 3-30 characters"));
        }
        try {
            CustomerProfileDTO profile = gamificationService.createOrGetProfile(username);
            return ResponseEntity.ok(profile);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(409)
                    .body(java.util.Map.of("error", "Username already taken! Choose another one."));
        }
    }

    /**
     * Get customer profile with badges and points
     * GET /api/public/gamification/profile?username=john_doe
     */
    @GetMapping("/profile")
    public ResponseEntity<CustomerProfileDTO> getProfile(@RequestParam String username) {
        if (username == null || username.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(gamificationService.getProfileWithBadges(username));
    }

    /**
     * Daily spin wheel
     * POST /api/public/gamification/spin
     * Body: { "username": "john_doe" }
     */
    @PostMapping("/spin")
    public ResponseEntity<SpinWheelResultDTO> spinWheel(@RequestParam String username) {
        if (username == null || username.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(gamificationService.spinWheel(username));
    }

    /**
     * Record a purchase (called after successful order)
     * POST /api/public/gamification/record-purchase
     * Body: { "username": "john_doe", "points": 10 }
     */
    @PostMapping("/record-purchase")
    public ResponseEntity<Void> recordPurchase(
            @RequestParam String username,
            @RequestParam Integer points) {
        if (username == null || username.trim().isEmpty() || points == null || points < 0) {
            return ResponseEntity.badRequest().build();
        }
        gamificationService.recordPurchase(username, points);
        return ResponseEntity.ok().build();
    }

    /**
     * Record a review
     * POST /api/public/gamification/record-review
     * Body: { "username": "john_doe", "rating": 5 }
     */
    @PostMapping("/record-review")
    public ResponseEntity<Void> recordReview(
            @RequestParam String username,
            @RequestParam Integer rating) {
        if (username == null || username.trim().isEmpty() || rating == null || rating < 1 || rating > 5) {
            return ResponseEntity.badRequest().build();
        }
        gamificationService.recordReview(username, rating);
        return ResponseEntity.ok().build();
    }

    /**
     * Record a referral
     * POST /api/public/gamification/record-referral
     * Body: { "username": "john_doe" }
     */
    @PostMapping("/record-referral")
    public ResponseEntity<Void> recordReferral(@RequestParam String username) {
        if (username == null || username.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        gamificationService.recordReferral(username);
        return ResponseEntity.ok().build();
    }

    /**
     * Redeem points for discount
     * POST /api/public/gamification/redeem
     * Body: { "username": "john_doe", "points": 100 }
     */
    @PostMapping("/redeem")
    public ResponseEntity<?> redeemPoints(
            @RequestParam String username,
            @RequestParam Integer points) {
        if (username == null || username.trim().isEmpty() || points == null || points <= 0) {
            return ResponseEntity.badRequest().build();
        }
        boolean success = gamificationService.redeemPoints(username, points);
        if (success) {
            return ResponseEntity.ok(java.util.Map.of("message", "Points redeemed successfully!"));
        } else {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(java.util.Map.of("error", "Insufficient points"));
        }
    }

    /**
     * Get leaderboard (top 10 players)
     * GET /api/public/gamification/leaderboard
     */
    @GetMapping("/leaderboard")
    public ResponseEntity<List<CustomerProfileDTO>> getLeaderboard() {
        return ResponseEntity.ok(gamificationService.getLeaderboard());
    }
}

