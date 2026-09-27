package com.solereax.inventory.basketball;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Random;

@Service
@RequiredArgsConstructor
public class BasketballShootingService {

    private final BasketballShootingGameRepository gameRepository;
    private final BasketballShotRepository shotRepository;

    private static final Random RANDOM = new Random();
    private static final String[] BOARD_POSITIONS = {
            "CENTER", "LEFT", "RIGHT", "TOP", "BOTTOM",
            "CORNER_TL", "CORNER_TR", "CORNER_BL", "CORNER_BR"
    };

    /**
     * Start a new shooting game
     */
    @Transactional
    public BasketballShootingGame startGame(String playerName) {
        BasketballShootingGame game = BasketballShootingGame.builder()
                .playerName(playerName)
                .level(1)
                .currentScore(0)
                .shotsAttempted(0)
                .shotsMade(0)
                .comboCounter(0)
                .boardRingPosition(getRandomBoardPosition())
                .boardRingDistance(1)
                .gameStatus("PLAYING")
                .build();

        return gameRepository.save(game);
    }

    /**
     * Record a shot attempt
     */
    @Transactional
    public BasketballShot recordShot(Long gameId, boolean isMade) {
        BasketballShootingGame game = gameRepository.findById(gameId)
                .orElseThrow(() -> new RuntimeException("Game not found"));

        if (!"PLAYING".equals(game.getGameStatus())) {
            throw new RuntimeException("Game is not active");
        }

        // Calculate points based on difficulty
        int basePoints = 10; // Base points per shot
        int difficultyMultiplier = game.getLevel();
        int distanceMultiplier = game.getBoardRingDistance();
        int pointsEarned = 0;
        int comboBonus = 0;

        if (isMade) {
            pointsEarned = basePoints * difficultyMultiplier * distanceMultiplier;
            game.setShotsMade(game.getShotsMade() + 1);
            game.setComboCounter(game.getComboCounter() + 1);

            // Combo bonus (every 3rd consecutive shot)
            if (game.getComboCounter() % 3 == 0) {
                comboBonus = game.getComboCounter() * 5;
                pointsEarned += comboBonus;
            }
        } else {
            game.setComboCounter(0);
        }

        game.setShotsAttempted(game.getShotsAttempted() + 1);
        game.setCurrentScore(game.getCurrentScore() + pointsEarned);

        // Move board/ring to new position
        game.setBoardRingPosition(getRandomBoardPosition());

        // Increase difficulty every 5 shots
        if (game.getShotsAttempted() % 5 == 0 && game.getLevel() < 10) {
            game.setLevel(game.getLevel() + 1);
            game.setBoardRingDistance(Math.min(3, game.getBoardRingDistance() + 1));
        }

        gameRepository.save(game);

        // Record the shot
        BasketballShot shot = BasketballShot.builder()
                .game(game)
                .shotNumber(game.getShotsAttempted())
                .boardRingPosition(game.getBoardRingPosition())
                .difficultyLevel(game.getLevel())
                .shotType(isMade ? "MADE" : "MISSED")
                .pointsEarned(pointsEarned)
                .comboBonus(comboBonus)
                .totalPointsAfter(game.getCurrentScore())
                .build();

        return shotRepository.save(shot);
    }

    /**
     * End the game and update leaderboard
     */
    @Transactional
    public BasketballShootingGame endGame(Long gameId) {
        BasketballShootingGame game = gameRepository.findById(gameId)
                .orElseThrow(() -> new RuntimeException("Game not found"));

        if ("FINISHED".equals(game.getGameStatus())) {
            return game;
        }

        game.setGameStatus("FINISHED");
        game.setFinishedAt(LocalDateTime.now());
        gameRepository.save(game);


        return game;
    }

    /**
     * Get all shots from a game
     */
    public List<BasketballShot> getGameShots(Long gameId) {
        return shotRepository.findByGameId(gameId);
    }


    /**
     * Get random board position
     */
    private String getRandomBoardPosition() {
        return BOARD_POSITIONS[RANDOM.nextInt(BOARD_POSITIONS.length)];
    }
}

