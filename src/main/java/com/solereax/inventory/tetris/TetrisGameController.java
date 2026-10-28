package com.solereax.inventory.tetris;

import com.solereax.inventory.settings.GamingService;
import com.solereax.inventory.user.AppUser;
import com.solereax.inventory.user.AppUserRepository;
import com.solereax.inventory.user.TetrisModerationStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/public/games/tetris")
@RequiredArgsConstructor
public class TetrisGameController {

    private final TetrisGameService gameService;
    private final GamingService gamingService;
    private final GiveawayBonusService giveawayBonusService;
    private final AppUserRepository appUserRepository;

    /**
     * Submit a Tetris game score
     * POST /api/public/games/tetris/scores
     * Body: { "playerName": "John", "score": 1500, "level": 5, "linesCleared": 12 }
     */
    @PostMapping("/scores")
    public ResponseEntity<?> submitScore(@RequestBody Map<String, Object> request, Principal principal) {
        if (principal == null || principal.getName() == null || principal.getName().isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Please sign in to submit scores."));
        }

        try {
            AppUser user = appUserRepository.findByUsernameIgnoreCase(principal.getName())
                    .orElseThrow(() -> new IllegalArgumentException("Authenticated user not found."));
            TetrisModerationStatus moderationStatus = user.getTetrisModerationStatus() != null
                    ? user.getTetrisModerationStatus()
                    : TetrisModerationStatus.NORMAL;

            if (moderationStatus.blocksGameplay()) {
                String moderationReason = user.getTetrisModerationReason();
                String defaultMessage = moderationStatus == TetrisModerationStatus.ANOMALY_DETECTED
                        ? "Your account is temporarily blocked from Tetris while we review an anomaly."
                        : "Your account is disqualified from Tetris leaderboard submissions.";
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                        "message",
                        moderationReason != null && !moderationReason.isBlank() ? moderationReason : defaultMessage,
                        "moderationStatus",
                        moderationStatus.name()
                ));
            }

            String playerName = user.getUsername();
            Integer score = ((Number) request.get("score")).intValue();
            Integer level = ((Number) request.get("level")).intValue();
            Integer linesCleared = request.containsKey("linesCleared") 
                ? ((Number) request.get("linesCleared")).intValue() 
                : 0;
            Long durationMs = request.containsKey("durationMs") && request.get("durationMs") instanceof Number
                    ? ((Number) request.get("durationMs")).longValue()
                    : null;
            String runId = request.containsKey("runId") && request.get("runId") instanceof String
                    ? ((String) request.get("runId")).trim()
                    : "";

            TetrisGameService.RealtimeTelemetry telemetry = new TetrisGameService.RealtimeTelemetry(
                    durationMs,
                    score,
                    level,
                    linesCleared,
                    request.containsKey("piecesLocked") && request.get("piecesLocked") instanceof Number
                            ? ((Number) request.get("piecesLocked")).intValue()
                            : 0,
                    request.containsKey("hardDrops") && request.get("hardDrops") instanceof Number
                            ? ((Number) request.get("hardDrops")).intValue()
                            : 0,
                    request.containsKey("softDrops") && request.get("softDrops") instanceof Number
                            ? ((Number) request.get("softDrops")).intValue()
                            : 0,
                    request.containsKey("inputs") && request.get("inputs") instanceof Number
                            ? ((Number) request.get("inputs")).intValue()
                            : 0
            );

            TetrisGameService.HeartbeatAssessment finalRunAssessment = gameService.finalizeRunSession(user.getUsername(), runId, telemetry);
            if (finalRunAssessment.suspicious()) {
                gamingService.updatePlayerModerationStatus(
                        user.getId(),
                        TetrisModerationStatus.ANOMALY_DETECTED,
                        finalRunAssessment.reason(),
                        "SYSTEM_AUTO_DETECT"
                );
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                        "message", finalRunAssessment.reason(),
                        "moderationStatus", TetrisModerationStatus.ANOMALY_DETECTED.name()
                ));
            }

            TetrisGameService.AnomalyAssessment anomalyAssessment = gameService.assessAnomaly(score, level, linesCleared, durationMs);
            if (anomalyAssessment.suspicious()) {
                gamingService.updatePlayerModerationStatus(
                        user.getId(),
                        TetrisModerationStatus.ANOMALY_DETECTED,
                        anomalyAssessment.reason(),
                        "SYSTEM_AUTO_DETECT"
                );
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                        "message", anomalyAssessment.reason(),
                        "moderationStatus", TetrisModerationStatus.ANOMALY_DETECTED.name()
                ));
            }

            Integer bonusPoints = giveawayBonusService.getActiveBonusPoints(user.getUsername());

            TetrisScoreSubmissionResponse result = gameService.recordScore(playerName, score, level, linesCleared, bonusPoints);
            return ResponseEntity.status(HttpStatus.CREATED).body(result);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Invalid score submission payload."));
        }
    }

    @PostMapping("/run/start")
    public ResponseEntity<?> startRun(Principal principal) {
        if (principal == null || principal.getName() == null || principal.getName().isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Please sign in to start a run."));
        }

        try {
            AppUser user = appUserRepository.findByUsernameIgnoreCase(principal.getName())
                    .orElseThrow(() -> new IllegalArgumentException("Authenticated user not found."));

            TetrisModerationStatus moderationStatus = user.getTetrisModerationStatus() != null
                    ? user.getTetrisModerationStatus()
                    : TetrisModerationStatus.NORMAL;
            if (moderationStatus.blocksGameplay()) {
                String moderationReason = user.getTetrisModerationReason();
                String defaultMessage = moderationStatus == TetrisModerationStatus.ANOMALY_DETECTED
                        ? "Your account is temporarily blocked from Tetris while we review an anomaly."
                        : "Your account is disqualified from Tetris leaderboard submissions.";
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                        "message", moderationReason != null && !moderationReason.isBlank() ? moderationReason : defaultMessage,
                        "moderationStatus", moderationStatus.name()
                ));
            }

            TetrisGameService.RunSessionStart runSession = gameService.startRunSession(user.getUsername());
            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                    "runId", runSession.runId(),
                    "heartbeatIntervalMs", runSession.heartbeatIntervalMs()
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/run/{runId}/heartbeat")
    public ResponseEntity<?> heartbeat(@PathVariable String runId, @RequestBody Map<String, Object> request, Principal principal) {
        if (principal == null || principal.getName() == null || principal.getName().isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Please sign in to continue this run."));
        }

        try {
            AppUser user = appUserRepository.findByUsernameIgnoreCase(principal.getName())
                    .orElseThrow(() -> new IllegalArgumentException("Authenticated user not found."));

            TetrisGameService.RealtimeTelemetry telemetry = new TetrisGameService.RealtimeTelemetry(
                    request.containsKey("elapsedMs") && request.get("elapsedMs") instanceof Number
                            ? ((Number) request.get("elapsedMs")).longValue()
                            : null,
                    request.containsKey("score") && request.get("score") instanceof Number
                            ? ((Number) request.get("score")).intValue()
                            : 0,
                    request.containsKey("level") && request.get("level") instanceof Number
                            ? ((Number) request.get("level")).intValue()
                            : 1,
                    request.containsKey("linesCleared") && request.get("linesCleared") instanceof Number
                            ? ((Number) request.get("linesCleared")).intValue()
                            : 0,
                    request.containsKey("piecesLocked") && request.get("piecesLocked") instanceof Number
                            ? ((Number) request.get("piecesLocked")).intValue()
                            : 0,
                    request.containsKey("hardDrops") && request.get("hardDrops") instanceof Number
                            ? ((Number) request.get("hardDrops")).intValue()
                            : 0,
                    request.containsKey("softDrops") && request.get("softDrops") instanceof Number
                            ? ((Number) request.get("softDrops")).intValue()
                            : 0,
                    request.containsKey("inputs") && request.get("inputs") instanceof Number
                            ? ((Number) request.get("inputs")).intValue()
                            : 0
            );

            TetrisGameService.HeartbeatAssessment heartbeatAssessment = gameService.assessRunHeartbeat(user.getUsername(), runId, telemetry);
            if (heartbeatAssessment.suspicious()) {
                gamingService.updatePlayerModerationStatus(
                        user.getId(),
                        TetrisModerationStatus.ANOMALY_DETECTED,
                        heartbeatAssessment.reason(),
                        "SYSTEM_AUTO_DETECT"
                );
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                        "message", heartbeatAssessment.reason(),
                        "moderationStatus", TetrisModerationStatus.ANOMALY_DETECTED.name()
                ));
            }

            return ResponseEntity.ok(Map.of("status", "ok"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Get top 10 players on leaderboard
     * GET /api/public/games/tetris/leaderboard?limit=10
     */
    @GetMapping("/leaderboard")
    public ResponseEntity<List<TetrisLeaderboardWithRank>> getLeaderboard(
            @RequestParam(defaultValue = "10") Integer limit) {
        try {
            List<TetrisLeaderboard> leaderboard = gameService.getTopPlayers();
            if (limit != null && limit > 0) {
                leaderboard = leaderboard.stream()
                        .limit(limit)
                        .toList();
            }

            // Add ranking to each entry
            List<TetrisLeaderboardWithRank> rankedLeaderboard = new java.util.ArrayList<>();
            for (int i = 0; i < leaderboard.size(); i++) {
                rankedLeaderboard.add(toRankedLeaderboardEntry(leaderboard.get(i), i + 1));
            }

            return ResponseEntity.ok(rankedLeaderboard);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get player stats
     * GET /api/public/games/tetris/player/{playerName}
     */
    @GetMapping("/player/{playerName}")
    public ResponseEntity<TetrisLeaderboardWithRank> getPlayerStats(@PathVariable String playerName) {
        try {
            TetrisLeaderboard stats = gameService.getPlayerStats(playerName);
            Integer playerRank = gameService.getPlayerRank(playerName);
            TetrisLeaderboardWithRank rankedStats = toRankedLeaderboardEntry(stats, playerRank);
            return ResponseEntity.ok(rankedStats);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Get full leaderboard
     * GET /api/public/games/tetris/leaderboard/all
     */
    @GetMapping("/leaderboard/all")
    public ResponseEntity<List<TetrisLeaderboardWithRank>> getFullLeaderboard() {
        try {
            List<TetrisLeaderboard> leaderboard = gameService.getFullLeaderboard();

            // Add ranking to each entry
            List<TetrisLeaderboardWithRank> rankedLeaderboard = new java.util.ArrayList<>();
            for (int i = 0; i < leaderboard.size(); i++) {
                rankedLeaderboard.add(toRankedLeaderboardEntry(leaderboard.get(i), i + 1));
            }

            return ResponseEntity.ok(rankedLeaderboard);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    private TetrisLeaderboardWithRank toRankedLeaderboardEntry(TetrisLeaderboard leaderboard, Integer rank) {
        int bonusPoints = giveawayBonusService.getActiveBonusPointsOrZero(leaderboard.getPlayerName());
        TetrisModerationStatus moderationStatus = gameService.getPlayerModerationStatus(leaderboard.getPlayerName());
        return TetrisLeaderboardWithRank.fromEntity(leaderboard, rank, bonusPoints, moderationStatus.name());
    }
}

