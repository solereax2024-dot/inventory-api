package com.solereax.inventory.gamification;

import com.solereax.inventory.gamification.dto.CustomerProfileDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Admin APIs for managing gamification (users, badges, points)
 */
@RestController
@RequestMapping("/api/admin/gamification")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
public class AdminGamificationController {
    private final CustomerProfileRepository customerProfileRepository;
    private final BadgeDefinitionRepository badgeDefinitionRepository;
    private final GamificationService gamificationService;

    /**
     * Get all customer profiles (paginated or limited)
     * GET /api/admin/gamification/customers
     */
    @GetMapping("/customers")
    public ResponseEntity<List<CustomerProfileDTO>> getAllCustomers() {
        List<CustomerProfileDTO> customers = customerProfileRepository.findAll()
                .stream()
                .map(profile -> {
                    CustomerProfileDTO dto = new CustomerProfileDTO(
                            profile.getId(),
                            profile.getUsername(),
                            profile.getPointsBalance(),
                            profile.getTotalPointsEarned(),
                            profile.getPurchasesCount(),
                            profile.getReviewsCount(),
                            profile.getReferralsCount(),
                            null, // badges
                            0 // unlockedBadgesCount
                    );
                    return dto;
                })
                .collect(Collectors.toList());
        return ResponseEntity.ok(customers);
    }

    /**
     * Get specific customer profile
     * GET /api/admin/gamification/customers/{username}
     */
    @GetMapping("/customers/{username}")
    public ResponseEntity<CustomerProfileDTO> getCustomer(@PathVariable String username) {
        return ResponseEntity.ok(gamificationService.getProfileWithBadges(username));
    }

    /**
     * Get all badge definitions
     * GET /api/admin/gamification/badges
     */
    @GetMapping("/badges")
    public ResponseEntity<List<BadgeDefinition>> getAllBadges() {
        return ResponseEntity.ok(badgeDefinitionRepository.findAll());
    }

    /**
     * Create or update a badge definition
     * POST /api/admin/gamification/badges
     */
    @PostMapping("/badges")
    public ResponseEntity<BadgeDefinition> createBadge(@RequestBody BadgeDefinition badge) {
        if (badge.getCode() == null || badge.getCode().trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        if (badge.getName() == null || badge.getName().trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(badgeDefinitionRepository.save(badge));
    }

    /**
     * Get leaderboard
     * GET /api/admin/gamification/leaderboard
     */
    @GetMapping("/leaderboard")
    public ResponseEntity<List<CustomerProfileDTO>> getLeaderboard() {
        return ResponseEntity.ok(gamificationService.getLeaderboard());
    }

    /**
     * Manually award points to a customer
     * POST /api/admin/gamification/customers/{username}/award-points
     * Body: { "points": 100 }
     */
    @PostMapping("/customers/{username}/award-points")
    public ResponseEntity<CustomerProfileDTO> awardPoints(
            @PathVariable String username,
            @RequestParam Integer points) {
        if (points == null || points <= 0) {
            return ResponseEntity.badRequest().build();
        }
        CustomerProfile profile = ((com.solereax.inventory.gamification.CustomerProfileRepository) customerProfileRepository)
                .findByUsername(username)
                .orElse(null);
        if (profile == null) {
            return ResponseEntity.notFound().build();
        }

        profile.setPointsBalance(profile.getPointsBalance() + points);
        profile.setTotalPointsEarned(profile.getTotalPointsEarned() + points);
        customerProfileRepository.save(profile);

        return ResponseEntity.ok(gamificationService.getProfileWithBadges(username));
    }

    /**
     * Reset a customer's points
     * DELETE /api/admin/gamification/customers/{username}/points
     */
    @DeleteMapping("/customers/{username}/points")
    public ResponseEntity<Void> resetPoints(@PathVariable String username) {
        CustomerProfile profile = customerProfileRepository.findByUsername(username)
                .orElse(null);
        if (profile == null) {
            return ResponseEntity.notFound().build();
        }

        profile.setPointsBalance(0);
        customerProfileRepository.save(profile);
        return ResponseEntity.ok().build();
    }
}

