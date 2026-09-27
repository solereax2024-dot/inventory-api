package com.solereax.inventory.basketball;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "basketball_shooting_games")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BasketballShootingGame {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String playerName;

    @Column(nullable = false)
    private Integer level = 1; // Level 1-10 (increases difficulty)

    @Column(nullable = false)
    private Integer currentScore = 0;

    @Column(nullable = false)
    private Integer shotsAttempted = 0;

    @Column(nullable = false)
    private Integer shotsMade = 0;

    @Column(nullable = false)
    private Integer comboCounter = 0; // Consecutive successful shots

    @Column(nullable = false)
    private String boardRingPosition = "CENTER"; // CENTER, LEFT, RIGHT, TOP, BOTTOM, CORNER_TL, CORNER_TR, CORNER_BL, CORNER_BR

    @Column(nullable = false)
    private Integer boardRingDistance = 1; // Distance multiplier (1=easy, 3=hard)

    @Column(nullable = false)
    private String gameStatus = "PLAYING"; // PLAYING, FINISHED

    @Column(nullable = false, updatable = false)
    private LocalDateTime startedAt;

    private LocalDateTime finishedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        startedAt = LocalDateTime.now();
    }
}
