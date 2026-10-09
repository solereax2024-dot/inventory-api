package com.solereax.inventory.tetris;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TetrisGameService {

    private final TetrisLeaderboardRepository leaderboardRepository;

    /**
     * Record a Tetris game score
     */
    @Transactional
    public TetrisLeaderboard recordScore(String playerName, Integer score, Integer level, Integer linesCleared) {
        return recordScore(playerName, score, level, linesCleared, 0);
    }

    @Transactional
    public TetrisLeaderboard recordScore(String playerName, Integer score, Integer level, Integer linesCleared, Integer bonusPoints) {
        if (playerName == null || playerName.trim().isEmpty()) {
            throw new IllegalArgumentException("Player name cannot be empty");
        }

        playerName = playerName.trim();
        int safeBonusPoints = bonusPoints != null ? Math.max(bonusPoints, 0) : 0;
        int finalScore = Math.max((score != null ? score : 0) + safeBonusPoints, 0);

        TetrisLeaderboard leaderboard = leaderboardRepository.findByPlayerNameIgnoreCase(playerName)
                .orElse(TetrisLeaderboard.builder()
                        .playerName(playerName)
                        .highestScore(0)
                        .highestLevel(1)
                        .totalGames(0)
                        .totalLinesCleared(0)
                        .build());

        // Update stats
        if (finalScore > leaderboard.getHighestScore()) {
            leaderboard.setHighestScore(finalScore);
        }
        
        if (level > leaderboard.getHighestLevel()) {
            leaderboard.setHighestLevel(level);
        }

        leaderboard.setTotalGames(leaderboard.getTotalGames() + 1);
        leaderboard.setTotalLinesCleared(leaderboard.getTotalLinesCleared() + (linesCleared != null ? linesCleared : 0));
        leaderboard.setLastPlayed(LocalDateTime.now());

        return leaderboardRepository.save(leaderboard);
    }

    /**
     * Get top players
     */
    public List<TetrisLeaderboard> getTopPlayers() {
        return leaderboardRepository.findTop10ByOrderByHighestScoreDesc();
    }

    /**
     * Get player stats
     */
    public TetrisLeaderboard getPlayerStats(String playerName) {
        return leaderboardRepository.findByPlayerNameIgnoreCase(playerName)
                .orElseThrow(() -> new RuntimeException("Player not found: " + playerName));
    }

    /**
     * Get full leaderboard
     */
    public List<TetrisLeaderboard> getFullLeaderboard() {
        return leaderboardRepository.findAllByOrderByHighestScoreDesc();
    }

    /**
     * Get player rank on leaderboard
     */
    public Integer getPlayerRank(String playerName) {
        List<TetrisLeaderboard> leaderboard = getFullLeaderboard();
        for (int i = 0; i < leaderboard.size(); i++) {
            if (leaderboard.get(i).getPlayerName().equalsIgnoreCase(playerName)) {
                return i + 1;
            }
        }
        return null; // Player not found
    }
}

