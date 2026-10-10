package com.solereax.inventory.tetris;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class TetrisGameServiceTest {

    @Mock
    private TetrisLeaderboardRepository leaderboardRepository;

    private TetrisGameService gameService;
    private List<TetrisLeaderboard> storedEntries;
    private AtomicLong nextId;

    @BeforeEach
    void setUp() {
        gameService = new TetrisGameService(leaderboardRepository);
        storedEntries = new ArrayList<>();
        nextId = new AtomicLong(1L);

        when(leaderboardRepository.findAll()).thenAnswer(invocation -> new ArrayList<>(storedEntries));
        when(leaderboardRepository.findByPlayerNameIgnoreCase(any())).thenAnswer(invocation -> {
            String playerName = invocation.getArgument(0, String.class);
            return storedEntries.stream()
                    .filter(entry -> normalize(entry.getPlayerName()).equals(normalize(playerName)))
                    .findFirst();
        });
        when(leaderboardRepository.save(any(TetrisLeaderboard.class))).thenAnswer(invocation -> {
            TetrisLeaderboard entry = invocation.getArgument(0, TetrisLeaderboard.class);
            if (entry.getId() == null) {
                entry.setId(nextId.getAndIncrement());
            }
            storedEntries.removeIf(existing -> normalize(existing.getPlayerName()).equals(normalize(entry.getPlayerName())));
            storedEntries.add(entry);
            return entry;
        });
        doAnswer(invocation -> {
            TetrisLeaderboard entry = invocation.getArgument(0, TetrisLeaderboard.class);
            storedEntries.removeIf(existing -> normalize(existing.getPlayerName()).equals(normalize(entry.getPlayerName())));
            return null;
        }).when(leaderboardRepository).delete(any(TetrisLeaderboard.class));
        doAnswer(invocation -> {
            Iterable<TetrisLeaderboard> entries = invocation.getArgument(0);
            List<String> playerKeysToRemove = new ArrayList<>();
            for (TetrisLeaderboard entry : entries) {
                playerKeysToRemove.add(normalize(entry.getPlayerName()));
            }
            storedEntries.removeIf(existing -> playerKeysToRemove.contains(normalize(existing.getPlayerName())));
            return null;
        }).when(leaderboardRepository).deleteAll(org.mockito.ArgumentMatchers.<Iterable<TetrisLeaderboard>>any());
    }

    @Test
    void recordScore_savesPlayerWhenScoreQualifiesForTopTen() {
        seedLeaderboardScores(1000, 900, 800, 700, 600, 500, 400, 300, 200, 100);

        TetrisScoreSubmissionResponse response = gameService.recordScore("New Challenger", 950, 6, 14, 0);

        assertTrue(response.isInTop10());
        assertEquals(2, response.getRank());
        assertEquals(10, storedEntries.size());
        assertTrue(storedEntries.stream().anyMatch(entry -> "New Challenger".equals(entry.getPlayerName())));
        assertFalse(storedEntries.stream().anyMatch(entry -> entry.getHighestScore() == 100));
    }

    @Test
    void recordScore_doesNotPersistPlayerWhenScoreMissesTopTen() {
        seedLeaderboardScores(1000, 900, 800, 700, 600, 500, 400, 300, 200, 100);

        TetrisScoreSubmissionResponse response = gameService.recordScore("Bubble Player", 50, 2, 4, 0);

        assertFalse(response.isInTop10());
        assertNull(response.getRank());
        assertEquals(10, storedEntries.size());
        assertFalse(storedEntries.stream().anyMatch(entry -> "Bubble Player".equals(entry.getPlayerName())));
    }

    @Test
    void recordScore_prunesExistingOverflowEvenWhenSubmissionMissesTopTen() {
        seedLeaderboardScores(1200, 1100, 1000, 900, 800, 700, 600, 500, 400, 300, 200, 100);

        TetrisScoreSubmissionResponse response = gameService.recordScore("Late Entry", 50, 1, 1, 0);

        assertFalse(response.isInTop10());
        assertEquals(10, storedEntries.size());
        List<Integer> remainingScores = storedEntries.stream()
                .map(TetrisLeaderboard::getHighestScore)
                .sorted(Comparator.reverseOrder())
                .toList();
        assertEquals(List.of(1200, 1100, 1000, 900, 800, 700, 600, 500, 400, 300), remainingScores);
    }

    @Test
    void recordScore_updatesExistingPlayerAndKeepsRankWhenStillTopTen() {
        seedLeaderboardScores(1000, 900, 800, 700, 600, 500, 400, 300, 200, 100);
        TetrisLeaderboard existingPlayer = storedEntries.stream()
                .filter(entry -> entry.getHighestScore() == 500)
                .findFirst()
                .orElseThrow();
        existingPlayer.setPlayerName("Repeat Player");

        TetrisScoreSubmissionResponse response = gameService.recordScore("Repeat Player", 650, 9, 20, 0);

        assertTrue(response.isInTop10());
        assertNotNull(response.getRank());
        assertEquals(5, response.getRank());
        Optional<TetrisLeaderboard> updatedEntry = storedEntries.stream()
                .filter(entry -> "Repeat Player".equals(entry.getPlayerName()))
                .findFirst();
        assertTrue(updatedEntry.isPresent());
        assertEquals(650, updatedEntry.get().getHighestScore());
        assertEquals(1, updatedEntry.get().getTotalGames());
        assertEquals(20, updatedEntry.get().getTotalLinesCleared());
    }

    private void seedLeaderboardScores(int... scores) {
        for (int index = 0; index < scores.length; index++) {
            storedEntries.add(TetrisLeaderboard.builder()
                    .id(nextId.getAndIncrement())
                    .playerName("Player " + (index + 1))
                    .highestScore(scores[index])
                    .highestLevel(Math.max(1, (index % 10) + 1))
                    .totalGames(0)
                    .totalLinesCleared(0)
                    .build());
        }
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }
}

