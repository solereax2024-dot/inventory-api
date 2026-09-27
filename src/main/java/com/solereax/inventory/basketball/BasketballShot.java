package com.solereax.inventory.basketball;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "basketball_shots")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BasketballShot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "game_id", nullable = false)
    private BasketballShootingGame game;

    @Column(nullable = false)
    private Integer shotNumber;

    @Column(nullable = false)
    private String boardRingPosition;

    @Column(nullable = false)
    private Integer difficultyLevel;

    @Column(nullable = false)
    private String shotType; // 'MADE', 'MISSED'

    @Column(nullable = false)
    private Integer pointsEarned = 0;

    @Column(nullable = false)
    private Integer comboBonus = 0;

    @Column(nullable = false)
    private Integer totalPointsAfter = 0;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
