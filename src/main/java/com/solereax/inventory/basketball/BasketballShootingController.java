package com.solereax.inventory.basketball;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/public/basketball")
@RequiredArgsConstructor
public class BasketballShootingController {

    private final BasketballShootingService shootingService;
    private final BasketballShootingGameRepository gameRepository;

    // ========== SPECIFIC ROUTES FIRST (Most specific to least specific) ==========

    /**
     * Start a new shooting game
     * POST /api/public/basketball/games/start?playerName=John
     */
    @PostMapping("/games/start")
    public ResponseEntity<BasketballShootingGame> startGame(@RequestParam String playerName) {
        try {
            BasketballShootingGame game = shootingService.startGame(playerName);
            return ResponseEntity.status(HttpStatus.CREATED).body(game);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }

    /**
     * Record a shot (make/miss)
     * POST /api/public/basketball/games/{gameId}/shoot?made=true
     */
    @PostMapping("/games/{gameId}/shoot")
    public ResponseEntity<BasketballShot> recordShot(
            @PathVariable Long gameId,
            @RequestParam boolean made) {
        try {
            BasketballShot shot = shootingService.recordShot(gameId, made);
            return ResponseEntity.ok(shot);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(null);
        }
    }

    /**
     * End the game
     * POST /api/public/basketball/games/{gameId}/end
     */
    @PostMapping("/games/{gameId}/end")
    public ResponseEntity<BasketballShootingGame> endGame(@PathVariable Long gameId) {
        try {
            BasketballShootingGame game = shootingService.endGame(gameId);
            return ResponseEntity.ok(game);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Get all shots from a game
     * GET /api/public/basketball/games/{gameId}/shots
     */
    @GetMapping("/games/{gameId}/shots")
    public ResponseEntity<List<BasketballShot>> getGameShots(@PathVariable Long gameId) {
        try {
            List<BasketballShot> shots = shootingService.getGameShots(gameId);
            return ResponseEntity.ok(shots);
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Get all games by player
     * GET /api/public/basketball/games/player/{playerName}
     */
    @GetMapping("/games/player/{playerName}")
    public ResponseEntity<List<BasketballShootingGame>> getPlayerGames(@PathVariable String playerName) {
        List<BasketballShootingGame> games = gameRepository.findByPlayerName(playerName);
        return ResponseEntity.ok(games);
    }

    /**
     * Get game details/status (GENERIC - MUST BE LAST)
     * GET /api/public/basketball/games/{gameId}
     */
    @GetMapping("/games/{gameId}")
    public ResponseEntity<BasketballShootingGame> getGameDetails(@PathVariable Long gameId) {
        try {
            BasketballShootingGame game = gameRepository.findById(gameId)
                    .orElseThrow(() -> new RuntimeException("Game not found"));
            return ResponseEntity.ok(game);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

}

