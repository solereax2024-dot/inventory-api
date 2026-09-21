package com.solereax.inventory.gamification;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;

@Getter
@Setter
@Entity
@Table(name = "badge_definitions")
public class BadgeDefinition {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String code;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(length = 300)
    private String description;

    @Column(name = "icon_emoji", length = 10)
    private String iconEmoji;

    @Column(name = "condition_type", nullable = false, length = 50)
    private String conditionType; // PURCHASES, REVIEWS, REFERRALS, EARLY_BIRD, COLOR_COLLECTOR

    @Column(name = "condition_threshold", nullable = false)
    private Integer conditionThreshold = 0;

    @Column(name = "points_reward", nullable = false)
    private Integer pointsReward = 0;

    @Column(nullable = false)
    private Boolean active = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();
}

