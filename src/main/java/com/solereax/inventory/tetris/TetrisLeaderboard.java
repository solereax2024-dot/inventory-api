package com.solereax.inventory.tetris;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "tetris_leaderboard")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TetrisLeaderboard {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String playerName;

    @Column(nullable = false)
    private Integer highestScore = 0;

    @Column(nullable = false)
    private Integer highestLevel = 1;

    @Column(nullable = false)
    private Integer totalGames = 0;

    @Column(nullable = false)
    private Integer totalLinesCleared = 0;

    private LocalDateTime lastPlayed;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}

