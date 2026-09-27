package com.solereax.inventory.tetris;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TetrisLeaderboardWithRank {
    private Long id;
    private String playerName;
    private Integer highestScore;
    private Integer highestLevel;
    private Integer totalGames;
    private Integer totalLinesCleared;
    private LocalDateTime lastPlayed;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Integer rank;

    public static TetrisLeaderboardWithRank fromEntity(TetrisLeaderboard leaderboard, Integer rank) {
        return TetrisLeaderboardWithRank.builder()
                .id(leaderboard.getId())
                .playerName(leaderboard.getPlayerName())
                .highestScore(leaderboard.getHighestScore())
                .highestLevel(leaderboard.getHighestLevel())
                .totalGames(leaderboard.getTotalGames())
                .totalLinesCleared(leaderboard.getTotalLinesCleared())
                .lastPlayed(leaderboard.getLastPlayed())
                .createdAt(leaderboard.getCreatedAt())
                .updatedAt(leaderboard.getUpdatedAt())
                .rank(rank)
                .build();
    }
}

