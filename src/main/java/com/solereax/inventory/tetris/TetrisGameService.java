package com.solereax.inventory.tetris;

import com.solereax.inventory.user.AppUserRepository;
import com.solereax.inventory.user.TetrisModerationStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

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
    private final TetrisRunSessionRepository runSessionRepository;

    public record AnomalyAssessment(boolean suspicious, String reason) {
    }

    public record RunSessionStart(String runId, Long heartbeatIntervalMs) {
    }

    public record HeartbeatAssessment(boolean suspicious, String reason) {
    }

    public record RealtimeTelemetry(
            Long elapsedMs,
            Integer score,
            Integer level,
            Integer linesCleared,
            Integer piecesLocked,
            Integer hardDrops,
            Integer softDrops,
            Integer inputs,
            String clientAlertCode
    ) {
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

    @Transactional
    public RunSessionStart startRunSession(String username) {
        String normalizedUsername = normalizePlayerName(username);
        if (normalizedUsername.isBlank()) {
            throw new IllegalArgumentException("User is required to start a run.");
        }

        cleanupExpiredRunSessions();

        Instant now = Instant.now();
        String runId = UUID.randomUUID().toString();
        TetrisRunSession session = TetrisRunSession.builder()
                .runId(runId)
                .username(username.trim())
                .startedAt(now)
                .lastHeartbeatAt(now)
                .lastElapsedMs(0L)
                .lastScore(0)
                .lastLevel(1)
                .lastLinesCleared(0)
                .lastPiecesLocked(0)
                .heartbeatCount(0)
                .suspiciousSignalCount(0)
                .blocked(false)
                .blockReason(null)
                .ended(false)
                .build();

        runSessionRepository.save(session);
        return new RunSessionStart(runId, 2000L);
    }

    @Transactional
    public HeartbeatAssessment assessRunHeartbeat(String username, String runId, RealtimeTelemetry telemetry) {
        TetrisRunSession session = getActiveRunSessionOrThrow(username, runId);
        if (session.isBlocked()) {
            return new HeartbeatAssessment(true, session.getBlockReason());
        }

        HeartbeatAssessment assessment = evaluateRealtimeSignals(session, telemetry, false);
        if (assessment.suspicious()) {
            session.setBlocked(true);
            session.setBlockReason(assessment.reason());
        }

        runSessionRepository.save(session);
        return assessment;
    }

    @Transactional
    public HeartbeatAssessment finalizeRunSession(String username, String runId, RealtimeTelemetry telemetry) {
        TetrisRunSession session = getActiveRunSessionOrThrow(username, runId);

        if (session.isBlocked()) {
            session.setEnded(true);
            runSessionRepository.save(session);
            return new HeartbeatAssessment(true, session.getBlockReason());
        }

        HeartbeatAssessment heartbeatAssessment = evaluateRealtimeSignals(session, telemetry, true);
        if (heartbeatAssessment.suspicious()) {
            session.setBlocked(true);
            session.setBlockReason(heartbeatAssessment.reason());
            session.setEnded(true);
            runSessionRepository.save(session);
            return heartbeatAssessment;
        }

        int heartbeatCount = session.getHeartbeatCount() != null ? session.getHeartbeatCount() : 0;
        if (heartbeatCount < 3) {
            session.setBlocked(true);
            session.setBlockReason("Run blocked: realtime telemetry was incomplete for this attempt.");
            session.setEnded(true);
            runSessionRepository.save(session);
            return new HeartbeatAssessment(true, session.getBlockReason());
        }

        session.setEnded(true);
        runSessionRepository.save(session);
        return new HeartbeatAssessment(false, "");
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
        return leaderboardRepository.findAll().stream()
                .sorted(LEADERBOARD_COMPARATOR)
                .toList();
    }

    public TetrisModerationStatus getPlayerModerationStatus(String playerName) {
        return appUserRepository.findByUsernameIgnoreCase(playerName)
                .map(user -> user.getTetrisModerationStatus() != null ? user.getTetrisModerationStatus() : TetrisModerationStatus.NORMAL)
                .orElse(TetrisModerationStatus.NORMAL);
    }

    private TetrisRunSession getActiveRunSessionOrThrow(String username, String runId) {
        if (runId == null || runId.isBlank()) {
            throw new IllegalArgumentException("Run session is missing.");
        }

        String safeUsername = username == null ? "" : username.trim();
        return runSessionRepository.findByRunIdAndUsernameIgnoreCaseAndEndedFalse(runId.trim(), safeUsername)
                .orElseThrow(() -> new IllegalArgumentException("Run session is not active. Please start a new game."));
    }

    private HeartbeatAssessment evaluateRealtimeSignals(TetrisRunSession session, RealtimeTelemetry telemetry, boolean includeFinalChecks) {
        long elapsedMs = Math.max(telemetry.elapsedMs() != null ? telemetry.elapsedMs() : 0L, 0L);
        int score = Math.max(telemetry.score() != null ? telemetry.score() : 0, 0);
        int level = Math.max(telemetry.level() != null ? telemetry.level() : 1, 1);
        int lines = Math.max(telemetry.linesCleared() != null ? telemetry.linesCleared() : 0, 0);
        int piecesLocked = Math.max(telemetry.piecesLocked() != null ? telemetry.piecesLocked() : 0, 0);

        Instant now = Instant.now();
        long previousElapsed = Math.max(session.getLastElapsedMs() != null ? session.getLastElapsedMs() : 0L, 0L);
        long deltaElapsed = elapsedMs - previousElapsed;
        long deltaWallClock = Math.max(now.toEpochMilli() - session.getLastHeartbeatAt().toEpochMilli(), 1L);

        int previousScore = Math.max(session.getLastScore() != null ? session.getLastScore() : 0, 0);
        int previousLines = Math.max(session.getLastLinesCleared() != null ? session.getLastLinesCleared() : 0, 0);
        int previousLockedPieces = Math.max(session.getLastPiecesLocked() != null ? session.getLastPiecesLocked() : 0, 0);

        int deltaScore = score - previousScore;
        int deltaLines = lines - previousLines;
        int deltaLockedPieces = piecesLocked - previousLockedPieces;

        int suspiciousSignals = Math.max(session.getSuspiciousSignalCount() != null ? session.getSuspiciousSignalCount() : 0, 0);
        String reason = "";

        String clientAlertCode = telemetry.clientAlertCode() == null ? "" : telemetry.clientAlertCode().trim();
        if (!clientAlertCode.isEmpty()) {
            suspiciousSignals += 2;
            reason = "Run blocked: client integrity alert detected (" + clientAlertCode + ").";
        }

        if (deltaElapsed <= 0L) {
            suspiciousSignals += 2;
            reason = "Run blocked: invalid telemetry timeline detected.";
        }

        long driftMs = Math.abs(deltaElapsed - deltaWallClock);
        if (driftMs > 7000L) {
            suspiciousSignals += 1;
            reason = "Run blocked: realtime timer drift exceeded fair-play limits.";
        }

        double seconds = Math.max(deltaElapsed / 1000.0, 0.001);
        double scorePerSecond = Math.max(deltaScore, 0) / seconds;
        double linesPerSecond = Math.max(deltaLines, 0) / seconds;

        if (scorePerSecond > 4500.0) {
            suspiciousSignals += 1;
            reason = "Run blocked: score throughput exceeded fair-play limits.";
        }

        if (linesPerSecond > 9.0) {
            suspiciousSignals += 1;
            reason = "Run blocked: line clear rate exceeded fair-play limits.";
        }

        if (deltaLines >= 4 && deltaLockedPieces <= 0) {
            suspiciousSignals += 1;
            reason = "Run blocked: telemetry mismatch detected between line clears and piece locks.";
        }

        if (includeFinalChecks) {
            if (elapsedMs < 20_000L && score >= 80_000) {
                suspiciousSignals += 2;
                reason = "Run blocked: impossible score acceleration detected for run duration.";
            }
            if (level > 30) {
                suspiciousSignals += 2;
                reason = "Run blocked: reached an unsupported level threshold for this build.";
            }
        }

        session.setLastHeartbeatAt(now);
        session.setLastElapsedMs(elapsedMs);
        session.setLastScore(score);
        session.setLastLevel(level);
        session.setLastLinesCleared(lines);
        session.setLastPiecesLocked(piecesLocked);
        session.setHeartbeatCount(Math.max(session.getHeartbeatCount() != null ? session.getHeartbeatCount() : 0, 0) + 1);
        session.setSuspiciousSignalCount(suspiciousSignals);

        if (suspiciousSignals >= 2) {
            String finalReason = reason == null || reason.isBlank()
                    ? "Run blocked: realtime telemetry indicates probable gameplay manipulation."
                    : reason;
            return new HeartbeatAssessment(true, finalReason);
        }

        return new HeartbeatAssessment(false, "");
    }

    private void cleanupExpiredRunSessions() {
        Instant cutoff = Instant.now().minusSeconds(60L * 60L * 3L);
        runSessionRepository.deleteByEndedTrueOrUpdatedAtBefore(cutoff);
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

