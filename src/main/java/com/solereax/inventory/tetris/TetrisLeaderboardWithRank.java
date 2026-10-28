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
    private Integer score;
    private Integer bonusPoints;
    private Integer highestScore;
    private Integer totalScore;
    private Integer highestLevel;
    private Integer totalGames;
    private Integer totalLinesCleared;
    private LocalDateTime lastPlayed;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Integer rank;
    private String moderationStatus;

    public static TetrisLeaderboardWithRank fromEntity(TetrisLeaderboard leaderboard, Integer rank, Integer bonusPoints) {
        return fromEntity(leaderboard, rank, bonusPoints, "NORMAL");
    }

    public static TetrisLeaderboardWithRank fromEntity(TetrisLeaderboard leaderboard, Integer rank, Integer bonusPoints, String moderationStatus) {
        int safeBonusPoints = bonusPoints != null ? Math.max(bonusPoints, 0) : 0;
        int totalScore = leaderboard.getHighestScore() != null ? leaderboard.getHighestScore() : 0;
        int baseScore = Math.max(totalScore - safeBonusPoints, 0);
        return TetrisLeaderboardWithRank.builder()
                .id(leaderboard.getId())
                .playerName(leaderboard.getPlayerName())
                .score(baseScore)
                .bonusPoints(safeBonusPoints)
                .highestScore(leaderboard.getHighestScore())
                .totalScore(totalScore)
                .highestLevel(leaderboard.getHighestLevel())
                .totalGames(leaderboard.getTotalGames())
                .totalLinesCleared(leaderboard.getTotalLinesCleared())
                .lastPlayed(leaderboard.getLastPlayed())
                .createdAt(leaderboard.getCreatedAt())
                .updatedAt(leaderboard.getUpdatedAt())
                .rank(rank)
                .moderationStatus(moderationStatus)
                .build();
    }
}

