package com.solereax.inventory.gamification;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;
import java.time.LocalDate;

@Getter
@Setter
@Entity
@Table(name = "daily_activities")
public class DailyActivity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private CustomerProfile customer;

    @Column(name = "activity_type", nullable = false, length = 50)
    private String activityType; // SPIN_WHEEL, PURCHASE, REVIEW, REFERRAL

    @Column(name = "points_earned", nullable = false)
    private Integer pointsEarned;

    @Column(name = "activity_date", nullable = false)
    private LocalDate activityDate;

    @Column(name = "completed_at", nullable = false, updatable = false)
    private Instant completedAt = Instant.now();
}

