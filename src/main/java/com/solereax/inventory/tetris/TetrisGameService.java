package com.solereax.inventory.tetris;

import com.solereax.inventory.user.AppUserRepository;
import com.solereax.inventory.user.TetrisModerationStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class TetrisGameService {

    private static final int LEADERBOARD_LIMIT = 10;
    private static final Comparator<TetrisLeaderboard> LEADERBOARD_COMPARATOR = Comparator
            .comparing((TetrisLeaderboard entry) -> safeInt(entry.getHighestScore()), Comparator.reverseOrder())
            .thenComparing(entry -> safeInt(entry.getHighestLevel()), Comparator.reverseOrder())
            .thenComparing(entry -> safeInt(entry.getTotalLinesCleared()), Comparator.reverseOrder())
            .thenComparing(entry -> normalizePlayerName(entry.getPlayerName()));

    private final TetrisLeaderboardRepository leaderboardRepository;
    private final AppUserRepository appUserRepository;

    public record AnomalyAssessment(boolean suspicious, String reason) {
    }

    /**
     * Record a Tetris game score
     */
    @Transactional
    public TetrisScoreSubmissionResponse recordScore(String playerName, Integer score, Integer level, Integer linesCleared) {
        return recordScore(playerName, score, level, linesCleared, 0);
    }

    @Transactional
    public TetrisScoreSubmissionResponse recordScore(String playerName, Integer score, Integer level, Integer linesCleared, Integer bonusPoints) {
        if (playerName == null || playerName.trim().isEmpty()) {
            throw new IllegalArgumentException("Player name cannot be empty");
        }

        playerName = playerName.trim();
        int safeLevel = Math.max(level != null ? level : 1, 1);
        int safeLinesCleared = Math.max(linesCleared != null ? linesCleared : 0, 0);
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

        if (finalScore > leaderboard.getHighestScore()) {
            leaderboard.setHighestScore(finalScore);
        }

        if (safeLevel > leaderboard.getHighestLevel()) {
            leaderboard.setHighestLevel(safeLevel);
        }

        leaderboard.setTotalGames(leaderboard.getTotalGames() + 1);
        leaderboard.setTotalLinesCleared(leaderboard.getTotalLinesCleared() + safeLinesCleared);
        leaderboard.setLastPlayed(LocalDateTime.now(ZoneId.of("Asia/Singapore")));

        String normalizedPlayerName = normalizePlayerName(playerName);
        List<TetrisLeaderboard> projectedLeaderboard = new ArrayList<>(getSortedLeaderboardEntries().stream()
                .filter(entry -> !normalizePlayerName(entry.getPlayerName()).equals(normalizedPlayerName))
                .toList());
        projectedLeaderboard.add(leaderboard);
        projectedLeaderboard.sort(LEADERBOARD_COMPARATOR);

        int projectedRank = findRank(projectedLeaderboard, playerName);
        boolean inTop10 = projectedRank > 0 && projectedRank <= LEADERBOARD_LIMIT;

        if (!inTop10) {
            if (leaderboard.getId() != null) {
                leaderboardRepository.delete(leaderboard);
            }
            pruneLeaderboardToTop10();
            return buildSubmissionResponse(leaderboard, null, false);
        }

        TetrisLeaderboard savedLeaderboard = leaderboardRepository.save(leaderboard);
        pruneLeaderboardToTop10();
        Integer savedRank = getPlayerRank(savedLeaderboard.getPlayerName());
        return buildSubmissionResponse(savedLeaderboard, savedRank, true);
    }

    public AnomalyAssessment assessAnomaly(Integer score, Integer level, Integer linesCleared, Long durationMs) {
        int safeScore = Math.max(score != null ? score : 0, 0);
        int safeLevel = Math.max(level != null ? level : 1, 1);
        int safeLines = Math.max(linesCleared != null ? linesCleared : 0, 0);

        if (safeLevel > 30) {
            return new AnomalyAssessment(true, "Run blocked: reached an unsupported level threshold for this build.");
        }

        if (durationMs == null || durationMs <= 0L) {
            return new AnomalyAssessment(false, "");
        }

        double minutes = durationMs / 60000.0;
        double linesPerMinute = minutes > 0 ? safeLines / minutes : 0;
        double scorePerMinute = minutes > 0 ? safeScore / minutes : 0;

        if (safeScore >= 100_000 && durationMs < 45_000L) {
            return new AnomalyAssessment(true, "Run blocked: score acceleration is outside fair-play limits.");
        }

        if (safeLevel >= 20 && safeScore >= 300_000 && (durationMs > 35L * 60L * 1000L || linesPerMinute < 8.0)) {
            return new AnomalyAssessment(true, "Run blocked: gameplay timing pattern indicates possible gravity slowdown manipulation.");
        }

        if (safeLevel >= 18 && scorePerMinute > 120_000.0) {
            return new AnomalyAssessment(true, "Run blocked: score throughput is outside expected fair-play range.");
        }

        return new AnomalyAssessment(false, "");
    }

    /**
     * Get top players
     */
    public List<TetrisLeaderboard> getTopPlayers() {
        return getSortedLeaderboardEntries().stream()
                .limit(LEADERBOARD_LIMIT)
                .toList();
    }

    /**
     * Get player stats
     */
    public TetrisLeaderboard getPlayerStats(String playerName) {
        return leaderboardRepository.findByPlayerNameIgnoreCase(playerName)
                .orElseThrow(() -> new RuntimeException("Player not found: " + playerName));
    }

    /**
     * Get full leaderboard (top 10 players)
     */
    public List<TetrisLeaderboard> getFullLeaderboard() {
        return getTopPlayers();
    }

    /**
     * Get player rank on leaderboard
     */
    public Integer getPlayerRank(String playerName) {
        List<TetrisLeaderboard> leaderboard = getFullLeaderboard();
        for (int i = 0; i < leaderboard.size(); i++) {
            if (normalizePlayerName(leaderboard.get(i).getPlayerName()).equals(normalizePlayerName(playerName))) {
                return i + 1;
            }
        }
        return null;
    }

    private TetrisScoreSubmissionResponse buildSubmissionResponse(TetrisLeaderboard leaderboard, Integer rank, boolean inTop10) {
        return TetrisScoreSubmissionResponse.builder()
                .playerName(leaderboard.getPlayerName())
                .highestScore(leaderboard.getHighestScore())
                .highestLevel(leaderboard.getHighestLevel())
                .totalGames(leaderboard.getTotalGames())
                .totalLinesCleared(leaderboard.getTotalLinesCleared())
                .rank(rank)
                .inTop10(inTop10)
                .build();
    }

    private void pruneLeaderboardToTop10() {
        List<TetrisLeaderboard> sortedEntries = getSortedLeaderboardEntries();
        if (sortedEntries.size() <= LEADERBOARD_LIMIT) {
            return;
        }

        leaderboardRepository.deleteAll(sortedEntries.subList(LEADERBOARD_LIMIT, sortedEntries.size()));
    }

    private List<TetrisLeaderboard> getSortedLeaderboardEntries() {
        Set<String> blockedPlayerKeys = new HashSet<>(appUserRepository.findAll().stream()
                .filter(user -> {
                    TetrisModerationStatus status = user.getTetrisModerationStatus();
                    return status != null && status.blocksGameplay();
                })
                .map(user -> normalizePlayerName(user.getUsername()))
                .toList());

        return leaderboardRepository.findAll().stream()
                .filter(entry -> !blockedPlayerKeys.contains(normalizePlayerName(entry.getPlayerName())))
                .sorted(LEADERBOARD_COMPARATOR)
                .toList();
    }

    private int findRank(List<TetrisLeaderboard> leaderboard, String playerName) {
        String normalizedPlayerName = normalizePlayerName(playerName);
        for (int i = 0; i < leaderboard.size(); i++) {
            if (normalizePlayerName(leaderboard.get(i).getPlayerName()).equals(normalizedPlayerName)) {
                return i + 1;
            }
        }

        return -1;
    }

    private static int safeInt(Integer value) {
        return value != null ? value : 0;
    }

    private static String normalizePlayerName(String playerName) {
        return playerName == null ? "" : playerName.trim().toLowerCase(Locale.ROOT);
    }
}

