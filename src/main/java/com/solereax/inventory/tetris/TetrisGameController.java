package com.solereax.inventory.tetris;

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
    private final TetrisLeaderboardRepository leaderboardRepository;
    private final GiveawayBonusService giveawayBonusService;

    /**
     * Submit a Tetris game score
     * POST /api/public/games/tetris/scores
     * Body: { "playerName": "John", "score": 1500, "level": 5, "linesCleared": 12 }
     */
    @PostMapping("/scores")
    public ResponseEntity<TetrisLeaderboard> submitScore(@RequestBody Map<String, Object> request, Principal principal) {
        try {
            String requestPlayerName = (String) request.get("playerName");
            String playerName = principal != null && principal.getName() != null && !principal.getName().isBlank()
                    ? principal.getName()
                    : requestPlayerName;
            Integer score = ((Number) request.get("score")).intValue();
            Integer level = ((Number) request.get("level")).intValue();
            Integer linesCleared = request.containsKey("linesCleared") 
                ? ((Number) request.get("linesCleared")).intValue() 
                : 0;
            Integer bonusPoints = principal != null ? giveawayBonusService.getActiveBonusPoints(principal.getName()) : 0;

            TetrisLeaderboard result = gameService.recordScore(playerName, score, level, linesCleared, bonusPoints);
            return ResponseEntity.status(HttpStatus.CREATED).body(result);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
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
                rankedLeaderboard.add(TetrisLeaderboardWithRank.fromEntity(leaderboard.get(i), i + 1));
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
            TetrisLeaderboardWithRank rankedStats = TetrisLeaderboardWithRank.fromEntity(stats, playerRank);
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
                rankedLeaderboard.add(TetrisLeaderboardWithRank.fromEntity(leaderboard.get(i), i + 1));
            }

            return ResponseEntity.ok(rankedLeaderboard);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}

