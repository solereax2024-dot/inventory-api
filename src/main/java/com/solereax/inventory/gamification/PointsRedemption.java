package com.solereax.inventory.gamification;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;

@Getter
@Setter
@Entity
@Table(name = "points_redemptions")
public class PointsRedemption {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private CustomerProfile customer;

    @Column(name = "points_amount", nullable = false)
    private Integer pointsAmount;

    @Column(name = "redemption_type", nullable = false, length = 50)
    private String redemptionType; // DISCOUNT_CODE, FREE_SHIPPING

    @Column(name = "reference_id", length = 120)
    private String referenceId;

    @Column(name = "redeemed_at", nullable = false, updatable = false)
    private Instant redeemedAt = Instant.now();
}

