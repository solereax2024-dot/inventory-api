package com.solereax.inventory.settings;

import com.solereax.inventory.tetris.TetrisLeaderboard;
import com.solereax.inventory.tetris.TetrisLeaderboardRepository;
import com.solereax.inventory.tetris.GiveawayBonusService;
import com.solereax.inventory.tetris.GiveawayBonusStatusResponse;
import com.solereax.inventory.user.AppUser;
import com.solereax.inventory.user.AppUserRepository;
import com.solereax.inventory.user.UserRole;
import com.solereax.inventory.user.dto.RegisteredPlayerResponse;
import java.time.Instant;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class GamingService {
    public static final String GAMING_SECTION_VISIBLE_KEY = "GAMING_SECTION_VISIBLE";

    private final AppSettingRepository appSettingRepository;
    private final AppUserRepository appUserRepository;
    private final TetrisLeaderboardRepository tetrisLeaderboardRepository;
    private final GiveawayBonusService giveawayBonusService;

    public GamingService(
            AppSettingRepository appSettingRepository,
            AppUserRepository appUserRepository,
            TetrisLeaderboardRepository tetrisLeaderboardRepository,
            GiveawayBonusService giveawayBonusService
    ) {
        this.appSettingRepository = appSettingRepository;
        this.appUserRepository = appUserRepository;
        this.tetrisLeaderboardRepository = tetrisLeaderboardRepository;
        this.giveawayBonusService = giveawayBonusService;
    }

    @Transactional(readOnly = true)
    public boolean isGamingSectionVisible() {
        return appSettingRepository.findById(GAMING_SECTION_VISIBLE_KEY)
                .map(AppSetting::getSettingValue)
                .map(value -> !"false".equalsIgnoreCase(value.trim()))
                .orElse(false);
    }

    @Transactional
    public boolean updateGamingSectionVisible(boolean visible) {
        AppSetting setting = appSettingRepository.findById(GAMING_SECTION_VISIBLE_KEY)
                .orElseGet(() -> {
                    AppSetting created = new AppSetting();
                    created.setSettingKey(GAMING_SECTION_VISIBLE_KEY);
                    return created;
                });
        setting.setSettingValue(Boolean.toString(visible));
        setting.setUpdatedAt(Instant.now());
        appSettingRepository.save(setting);
        return visible;
    }

    @Transactional(readOnly = true)
    public List<RegisteredPlayerResponse> listRegisteredPlayers() {
        List<TetrisLeaderboard> leaderboardEntries = tetrisLeaderboardRepository.findAllByOrderByHighestScoreDesc();
        Map<String, TetrisLeaderboard> leaderboardByPlayerKey = new HashMap<>();
        Map<String, Integer> rankByPlayerKey = new HashMap<>();

        for (int index = 0; index < leaderboardEntries.size(); index++) {
            TetrisLeaderboard entry = leaderboardEntries.get(index);
            String playerKey = normalizeKey(entry.getPlayerName());
            if (playerKey.isEmpty() || leaderboardByPlayerKey.containsKey(playerKey)) {
                continue;
            }
            leaderboardByPlayerKey.put(playerKey, entry);
            rankByPlayerKey.put(playerKey, index + 1);
        }

        return appUserRepository.findAll().stream()
                .filter(user -> user.getRole() == UserRole.CUSTOMER)
                .map(user -> toRegisteredPlayerResponse(
                        user,
                        leaderboardByPlayerKey.get(normalizeKey(user.getUsername())),
                        rankByPlayerKey.get(normalizeKey(user.getUsername()))
                ))
                .filter(player -> player.rank() != null && player.rank() > 0 && player.rank() <= 10)
                .sorted(Comparator
                        .comparing((RegisteredPlayerResponse player) -> player.rank() == null ? Integer.MAX_VALUE : player.rank())
                        .thenComparing((RegisteredPlayerResponse player) -> player.highestScore() == null ? 0 : player.highestScore(), Comparator.reverseOrder())
                        .thenComparing((RegisteredPlayerResponse player) -> player.totalLinesCleared() == null ? 0 : player.totalLinesCleared(), Comparator.reverseOrder())
                        .thenComparing((RegisteredPlayerResponse player) -> player.createdAt(), Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing((RegisteredPlayerResponse player) -> player.username() == null ? "" : player.username(), String.CASE_INSENSITIVE_ORDER))
                .limit(10) // Limit to top 10 players
                .toList();
    }

    private RegisteredPlayerResponse toRegisteredPlayerResponse(AppUser user, TetrisLeaderboard leaderboard, Integer rank) {
        GiveawayBonusStatusResponse bonusStatus = giveawayBonusService.getBonusStatus(user);
        return new RegisteredPlayerResponse(
                user.getId(),
                user.getUsername(),
                user.getFullName(),
                user.getProfileImagePath(),
                user.isFacebookWinnerContactConsent(),
                user.isEnabled(),
                user.getCreatedAt(),
                rank,
                leaderboard != null ? leaderboard.getHighestScore() : 0,
                leaderboard != null ? leaderboard.getHighestLevel() : 1,
                leaderboard != null ? leaderboard.getTotalGames() : 0,
                leaderboard != null ? leaderboard.getTotalLinesCleared() : 0,
                leaderboard != null ? leaderboard.getLastPlayed() : null,
                bonusStatus
        );
    }

    private String normalizeKey(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    @Transactional
    public void deletePlayer(Long userId) {
        // Get username before deleting the user
        String username = appUserRepository.findById(userId)
            .map(AppUser::getUsername)
            .orElse(null);

        // Delete the player account (bonus data is stored in AppUser and will be deleted)
        appUserRepository.deleteById(userId);

        // Delete the player's tetris leaderboard data
        if (username != null) {
            tetrisLeaderboardRepository.deleteByPlayerNameIgnoreCase(username);
        }
    }

    @Transactional
    public void deleteAllPlayers() {
        // Get all customer players
        List<AppUser> customers = appUserRepository.findAll().stream()
                .filter(user -> user.getRole() == UserRole.CUSTOMER)
                .toList();

        // Delete all customer accounts (bonus data is stored in AppUser and will be deleted)
        for (AppUser customer : customers) {
            appUserRepository.deleteById(customer.getId());
        }

        // Delete each player's leaderboard data
        for (AppUser customer : customers) {
            tetrisLeaderboardRepository.deleteByPlayerNameIgnoreCase(customer.getUsername());
        }
    }
}
