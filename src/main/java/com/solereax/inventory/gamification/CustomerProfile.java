package com.solereax.inventory.gamification;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;

@Getter
@Setter
@Entity
@Table(name = "customer_profiles")
public class CustomerProfile {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 100)
    private String username;

    @Column(name = "points_balance", nullable = false)
    private Integer pointsBalance = 0;

    @Column(name = "total_points_earned", nullable = false)
    private Integer totalPointsEarned = 0;

    @Column(name = "purchases_count", nullable = false)
    private Integer purchasesCount = 0;

    @Column(name = "reviews_count", nullable = false)
    private Integer reviewsCount = 0;

    @Column(name = "referrals_count", nullable = false)
    private Integer referralsCount = 0;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @Column(name = "last_activity_at")
    private Instant lastActivityAt;
}

