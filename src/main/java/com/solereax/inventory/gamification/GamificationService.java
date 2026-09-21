package com.solereax.inventory.gamification;

import com.solereax.inventory.gamification.dto.BadgeDTO;
import com.solereax.inventory.gamification.dto.CustomerProfileDTO;
import com.solereax.inventory.gamification.dto.SpinWheelResultDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.Random;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class GamificationService {
    private final CustomerProfileRepository customerProfileRepository;
    private final BadgeDefinitionRepository badgeDefinitionRepository;
    private final CustomerBadgeRepository customerBadgeRepository;
    private final DailyActivityRepository dailyActivityRepository;
    private final PointsRedemptionRepository pointsRedemptionRepository;

    private static final int[] SPIN_WHEEL_REWARDS = {5, 10, 15, 20, 25, 10, 15, 30};
    private static final int SPIN_WHEEL_DAILY_LIMIT = 1; // One spin per day

    /**
     * Get or create customer profile by username
     */
    @Transactional
    public CustomerProfile getOrCreateProfile(String username) {
        return customerProfileRepository.findByUsername(username)
                .orElseGet(() -> {
                    CustomerProfile profile = new CustomerProfile();
                    profile.setUsername(username);
                    profile.setPointsBalance(0);
                    profile.setTotalPointsEarned(0);
                    profile.setPurchasesCount(0);
                    profile.setReviewsCount(0);
                    profile.setReferralsCount(0);
                    return customerProfileRepository.save(profile);
                });
    }

    /**
     * Create or get profile - throws exception if username already taken by another user
     */
    @Transactional
    public CustomerProfileDTO createOrGetProfile(String username) {
        try {
            Optional<CustomerProfile> existing = customerProfileRepository.findByUsername(username);
            if (existing.isPresent()) {
                return buildProfileDTO(existing.get());
            }

            CustomerProfile profile = new CustomerProfile();
            profile.setUsername(username);
            profile.setPointsBalance(0);
            profile.setTotalPointsEarned(0);
            profile.setPurchasesCount(0);
            profile.setReviewsCount(0);
            profile.setReferralsCount(0);

            CustomerProfile saved = customerProfileRepository.save(profile);
            return buildProfileDTO(saved);
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            throw new IllegalArgumentException("Username already taken!");
        }
    }

    /**
     * Get customer profile with badges
     */
    public CustomerProfileDTO getProfileWithBadges(String username) {
        CustomerProfile profile = getOrCreateProfile(username);
        return buildProfileDTO(profile);
    }

    /**
     * Daily spin wheel - earn random points (once per day)
     */
    @Transactional
    public SpinWheelResultDTO spinWheel(String username) {
        CustomerProfile profile = getOrCreateProfile(username);
        LocalDate today = LocalDate.now();

        // Check if already spun today
        Optional<DailyActivity> existingSpin = dailyActivityRepository
                .findByCustomerIdAndActivityTypeAndActivityDate(profile.getId(), "SPIN_WHEEL", today);

        if (existingSpin.isPresent()) {
            return new SpinWheelResultDTO(0, "You already spun today! Come back tomorrow.", profile.getPointsBalance());
        }

        // Get random reward
        Random random = new Random();
        int points = SPIN_WHEEL_REWARDS[random.nextInt(SPIN_WHEEL_REWARDS.length)];

        // Record activity
        DailyActivity activity = new DailyActivity();
        activity.setCustomer(profile);
        activity.setActivityType("SPIN_WHEEL");
        activity.setPointsEarned(points);
        activity.setActivityDate(today);
        dailyActivityRepository.save(activity);

        // Update points
        profile.setPointsBalance(profile.getPointsBalance() + points);
        profile.setTotalPointsEarned(profile.getTotalPointsEarned() + points);
        profile.setLastActivityAt(Instant.now());
        customerProfileRepository.save(profile);

        return new SpinWheelResultDTO(points, "🎉 You won " + points + " points!", profile.getPointsBalance());
    }

    /**
     * Record a purchase and check for badges
     */
    @Transactional
    public void recordPurchase(String username, Integer pointsFromPurchase) {
        CustomerProfile profile = getOrCreateProfile(username);

        // Add points from purchase
        profile.setPurchasesCount(profile.getPurchasesCount() + 1);
        profile.setPointsBalance(profile.getPointsBalance() + pointsFromPurchase);
        profile.setTotalPointsEarned(profile.getTotalPointsEarned() + pointsFromPurchase);
        profile.setLastActivityAt(Instant.now());

        // Record activity
        DailyActivity activity = new DailyActivity();
        activity.setCustomer(profile);
        activity.setActivityType("PURCHASE");
        activity.setPointsEarned(pointsFromPurchase);
        activity.setActivityDate(LocalDate.now());
        dailyActivityRepository.save(activity);

        // Check for badges
        checkAndUnlockBadge(profile, "SNEAKERHEAD");
        checkAndUnlockBadge(profile, "EARLY_BIRD");

        customerProfileRepository.save(profile);
    }

    /**
     * Record a review and check for badges
     */
    @Transactional
    public void recordReview(String username, Integer rating) {
        CustomerProfile profile = getOrCreateProfile(username);

        if (rating == 5) {
            // Award points for 5-star review
            int points = 20;
            profile.setReviewsCount(profile.getReviewsCount() + 1);
            profile.setPointsBalance(profile.getPointsBalance() + points);
            profile.setTotalPointsEarned(profile.getTotalPointsEarned() + points);
            profile.setLastActivityAt(Instant.now());

            // Record activity
            DailyActivity activity = new DailyActivity();
            activity.setCustomer(profile);
            activity.setActivityType("REVIEW");
            activity.setPointsEarned(points);
            activity.setActivityDate(LocalDate.now());
            dailyActivityRepository.save(activity);

            // Check for 5-star reviewer badge
            checkAndUnlockBadge(profile, "FIVE_STAR_REVIEWER");
        }

        customerProfileRepository.save(profile);
    }

    /**
     * Record a referral
     */
    @Transactional
    public void recordReferral(String username) {
        CustomerProfile profile = getOrCreateProfile(username);

        profile.setReferralsCount(profile.getReferralsCount() + 1);
        profile.setPointsBalance(profile.getPointsBalance() + 50); // 50 points per referral
        profile.setTotalPointsEarned(profile.getTotalPointsEarned() + 50);
        profile.setLastActivityAt(Instant.now());

        // Record activity
        DailyActivity activity = new DailyActivity();
        activity.setCustomer(profile);
        activity.setActivityType("REFERRAL");
        activity.setPointsEarned(50);
        activity.setActivityDate(LocalDate.now());
        dailyActivityRepository.save(activity);

        // Check for Gift Giver badge
        checkAndUnlockBadge(profile, "GIFT_GIVER");

        customerProfileRepository.save(profile);
    }

    /**
     * Redeem points for discount
     */
    @Transactional
    public boolean redeemPoints(String username, Integer pointsToRedeem) {
        CustomerProfile profile = getOrCreateProfile(username);

        if (profile.getPointsBalance() < pointsToRedeem) {
            return false; // Not enough points
        }

        profile.setPointsBalance(profile.getPointsBalance() - pointsToRedeem);
        customerProfileRepository.save(profile);

        // Record redemption
        PointsRedemption redemption = new PointsRedemption();
        redemption.setCustomer(profile);
        redemption.setPointsAmount(pointsToRedeem);
        redemption.setRedemptionType("DISCOUNT_CODE");
        pointsRedemptionRepository.save(redemption);

        return true;
    }

    /**
     * Check and unlock badge if conditions are met
     */
    private void checkAndUnlockBadge(CustomerProfile profile, String badgeCode) {
        // Don't process if badge already earned
        Optional<BadgeDefinition> badgeOpt = badgeDefinitionRepository.findByCode(badgeCode);
        if (badgeOpt.isEmpty()) return;

        BadgeDefinition badge = badgeOpt.get();
        boolean alreadyEarned = customerBadgeRepository.existsByCustomerIdAndBadgeId(profile.getId(), badge.getId());
        if (alreadyEarned) return;

        // Check conditions
        boolean shouldUnlock = false;

        switch (badge.getConditionType()) {
            case "PURCHASES":
                shouldUnlock = profile.getPurchasesCount() >= badge.getConditionThreshold();
                break;
            case "REVIEWS":
                shouldUnlock = profile.getReviewsCount() >= badge.getConditionThreshold();
                break;
            case "REFERRALS":
                shouldUnlock = profile.getReferralsCount() >= badge.getConditionThreshold();
                break;
            case "EARLY_BIRD":
                // Check if purchase was made on first day of account
                long daysOld = java.time.temporal.ChronoUnit.DAYS.between(
                        profile.getCreatedAt().atZone(java.time.ZoneId.systemDefault()).toLocalDate(),
                        LocalDate.now()
                );
                shouldUnlock = daysOld == 0 && profile.getPurchasesCount() >= 1;
                break;
        }

        // Unlock badge if conditions met
        if (shouldUnlock) {
            CustomerBadge customerBadge = new CustomerBadge();
            customerBadge.setCustomer(profile);
            customerBadge.setBadge(badge);
            customerBadgeRepository.save(customerBadge);

            // Award points for badge
            profile.setPointsBalance(profile.getPointsBalance() + badge.getPointsReward());
            profile.setTotalPointsEarned(profile.getTotalPointsEarned() + badge.getPointsReward());
            customerProfileRepository.save(profile);
        }
    }

    /**
     * Build profile DTO with badges
     */
    private CustomerProfileDTO buildProfileDTO(CustomerProfile profile) {
        List<BadgeDefinition> allBadges = badgeDefinitionRepository.findAll();
        List<CustomerBadge> earnedBadges = customerBadgeRepository.findByCustomerId(profile.getId());

        List<BadgeDTO> badgeDTOs = allBadges.stream()
                .map(badge -> {
                    boolean earned = earnedBadges.stream()
                            .anyMatch(cb -> cb.getBadge().getId().equals(badge.getId()));
                    return new BadgeDTO(
                            badge.getId(),
                            badge.getCode(),
                            badge.getName(),
                            badge.getDescription(),
                            badge.getIconEmoji(),
                            badge.getPointsReward(),
                            earned
                    );
                })
                .collect(Collectors.toList());

        long unlockedCount = badgeDTOs.stream().filter(BadgeDTO::getEarned).count();

        return new CustomerProfileDTO(
                profile.getId(),
                profile.getUsername(),
                profile.getPointsBalance(),
                profile.getTotalPointsEarned(),
                profile.getPurchasesCount(),
                profile.getReviewsCount(),
                profile.getReferralsCount(),
                badgeDTOs,
                (int) unlockedCount
        );
    }

    /**
     * Get leaderboard (top 10 by points)
     */
    public List<CustomerProfileDTO> getLeaderboard() {
        List<CustomerProfile> topProfiles = customerProfileRepository.findAll();
        return topProfiles.stream()
                .sorted((a, b) -> b.getPointsBalance().compareTo(a.getPointsBalance()))
                .limit(10)
                .map(this::buildProfileDTO)
                .collect(Collectors.toList());
    }
}

