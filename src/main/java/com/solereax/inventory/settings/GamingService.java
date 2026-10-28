package com.solereax.inventory.settings;

import com.solereax.inventory.notification.PlayerNotificationService;
import com.solereax.inventory.notification.PlayerNotificationType;
import com.solereax.inventory.tetris.TetrisLeaderboard;
import com.solereax.inventory.tetris.TetrisLeaderboardRepository;
import com.solereax.inventory.tetris.TetrisModerationAuditLog;
import com.solereax.inventory.tetris.TetrisModerationAuditLogRepository;
import com.solereax.inventory.tetris.GiveawayBonusService;
import com.solereax.inventory.tetris.GiveawayBonusStatusResponse;
import com.solereax.inventory.user.AppUser;
import com.solereax.inventory.user.AppUserRepository;
import com.solereax.inventory.user.TetrisModerationStatus;
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
    public static final String GIVEAWAY_ONE_VISIBLE_KEY = "GIVEAWAY_1_VISIBLE";
    public static final String GIVEAWAY_TWO_VISIBLE_KEY = "GIVEAWAY_2_VISIBLE";

    private final AppSettingRepository appSettingRepository;
    private final AppUserRepository appUserRepository;
    private final TetrisLeaderboardRepository tetrisLeaderboardRepository;
    private final TetrisModerationAuditLogRepository tetrisModerationAuditLogRepository;
    private final GiveawayBonusService giveawayBonusService;
    private final PlayerNotificationService playerNotificationService;

    public GamingService(
            AppSettingRepository appSettingRepository,
            AppUserRepository appUserRepository,
            TetrisLeaderboardRepository tetrisLeaderboardRepository,
            TetrisModerationAuditLogRepository tetrisModerationAuditLogRepository,
            GiveawayBonusService giveawayBonusService,
            PlayerNotificationService playerNotificationService
    ) {
        this.appSettingRepository = appSettingRepository;
        this.appUserRepository = appUserRepository;
        this.tetrisLeaderboardRepository = tetrisLeaderboardRepository;
        this.tetrisModerationAuditLogRepository = tetrisModerationAuditLogRepository;
        this.giveawayBonusService = giveawayBonusService;
        this.playerNotificationService = playerNotificationService;
    }

    @Transactional(readOnly = true)
    public boolean isGamingSectionVisible() {
        return isGiveawayOneVisible() || isGiveawayTwoVisible();
    }

    @Transactional(readOnly = true)
    public boolean isGiveawayOneVisible() {
        return readVisibilitySetting(GIVEAWAY_ONE_VISIBLE_KEY, GAMING_SECTION_VISIBLE_KEY);
    }

    @Transactional(readOnly = true)
    public boolean isGiveawayTwoVisible() {
        return readVisibilitySetting(GIVEAWAY_TWO_VISIBLE_KEY, null);
    }

    @Transactional(readOnly = true)
    public boolean isGiveawayVisible(Long giveawayId) {
        long normalizedGiveawayId = normalizeGiveawayId(giveawayId);
        if (normalizedGiveawayId == 2L) {
            return isGiveawayTwoVisible();
        }
        return isGiveawayOneVisible();
    }

    @Transactional
    public boolean updateGamingSectionVisible(boolean visible) {
        // Keep legacy endpoint behavior by updating both giveaways together.
        saveVisibilitySetting(GAMING_SECTION_VISIBLE_KEY, visible);
        saveVisibilitySetting(GIVEAWAY_ONE_VISIBLE_KEY, visible);
        saveVisibilitySetting(GIVEAWAY_TWO_VISIBLE_KEY, visible);
        return visible;
    }

    @Transactional
    public boolean updateGiveawayVisibility(Long giveawayId, boolean visible) {
        long normalizedGiveawayId = normalizeGiveawayId(giveawayId);
        if (normalizedGiveawayId == 2L) {
            saveVisibilitySetting(GIVEAWAY_TWO_VISIBLE_KEY, visible);
            return visible;
        }

        saveVisibilitySetting(GIVEAWAY_ONE_VISIBLE_KEY, visible);
        return visible;
    }

    private boolean readVisibilitySetting(String key, String fallbackKey) {
        Boolean primary = appSettingRepository.findById(key)
                .map(AppSetting::getSettingValue)
                .map(this::parseVisibilityValue)
                .orElse(null);
        if (primary != null) {
            return primary;
        }

        if (fallbackKey == null) {
            return false;
        }

        return appSettingRepository.findById(fallbackKey)
                .map(AppSetting::getSettingValue)
                .map(this::parseVisibilityValue)
                .orElse(false);
    }

    private boolean parseVisibilityValue(String value) {
        return !"false".equalsIgnoreCase(value == null ? "" : value.trim());
    }

    private void saveVisibilitySetting(String key, boolean visible) {
        AppSetting setting = appSettingRepository.findById(key)
                .orElseGet(() -> {
                    AppSetting created = new AppSetting();
                    created.setSettingKey(key);
                    return created;
                });
        setting.setSettingValue(Boolean.toString(visible));
        setting.setUpdatedAt(Instant.now());
        appSettingRepository.save(setting);
    }

    private long normalizeGiveawayId(Long giveawayId) {
        return giveawayId == null || giveawayId < 1 ? 1L : giveawayId;
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
                .filter(player -> {
                    String status = player.tetrisModerationStatus() == null ? TetrisModerationStatus.NORMAL.name() : player.tetrisModerationStatus();
                    boolean isModerated = !TetrisModerationStatus.NORMAL.name().equalsIgnoreCase(status);
                    boolean inTop10 = player.rank() != null && player.rank() > 0 && player.rank() <= 10;
                    return inTop10 || isModerated;
                })
                .sorted(Comparator
                        .comparing((RegisteredPlayerResponse player) -> player.rank() == null ? Integer.MAX_VALUE : player.rank())
                        .thenComparing((RegisteredPlayerResponse player) -> player.highestScore() == null ? 0 : player.highestScore(), Comparator.reverseOrder())
                        .thenComparing((RegisteredPlayerResponse player) -> player.totalLinesCleared() == null ? 0 : player.totalLinesCleared(), Comparator.reverseOrder())
                        .thenComparing((RegisteredPlayerResponse player) -> player.createdAt(), Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing((RegisteredPlayerResponse player) -> player.username() == null ? "" : player.username(), String.CASE_INSENSITIVE_ORDER))
                .toList();
    }

    @Transactional(readOnly = true)
    public long countRegisteredPlayers() {
        return appUserRepository.findAll().stream()
                .filter(user -> user.getRole() == UserRole.CUSTOMER)
                .count();
    }

     private RegisteredPlayerResponse toRegisteredPlayerResponse(AppUser user, TetrisLeaderboard leaderboard, Integer rank) {
         GiveawayBonusStatusResponse bonusStatus = giveawayBonusService.getBonusStatus(user);
         int activeBonusPoints = bonusStatus != null ? bonusStatus.totalBonusPoints() : 0;
         int leaderboardScore = leaderboard != null && leaderboard.getHighestScore() != null ? leaderboard.getHighestScore() : 0;
         int baseScore = Math.max(leaderboardScore - activeBonusPoints, 0);
         return new RegisteredPlayerResponse(
                 user.getId(),
                 user.getUsername(),
                 user.getFullName(),
                 user.getProfileImagePath(),
                 user.isProfileImageValidated(),
                 user.getProfileImageValidationMessage(),
                 user.isFacebookWinnerContactConsent(),
                 user.isEnabled(),
                 user.getCreatedAt(),
                 rank,
                 baseScore,
                 leaderboardScore,
                 leaderboard != null ? leaderboard.getHighestLevel() : 1,
                 leaderboard != null ? leaderboard.getTotalGames() : 0,
                 leaderboard != null ? leaderboard.getTotalLinesCleared() : 0,
                 activeBonusPoints,
                 leaderboard != null ? leaderboard.getLastPlayed() : null,
                 bonusStatus,
                 user.getTetrisModerationStatus() != null ? user.getTetrisModerationStatus().name() : TetrisModerationStatus.NORMAL.name(),
                 user.getTetrisModerationReason(),
                 user.getTetrisModeratedAt()
         );
     }

    @Transactional
    public RegisteredPlayerResponse updatePlayerModerationStatus(Long userId, TetrisModerationStatus status, String reason, String actedBy) {
        AppUser user = appUserRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (user.getRole() != UserRole.CUSTOMER) {
            throw new IllegalArgumentException("Only customer accounts can be moderated for Tetris gameplay.");
        }

        TetrisModerationStatus nextStatus = status == null ? TetrisModerationStatus.NORMAL : status;
        String sanitizedReason = reason == null ? "" : reason.trim();

        if (nextStatus != TetrisModerationStatus.NORMAL && sanitizedReason.isEmpty()) {
            throw new IllegalArgumentException("A moderation reason is required for anomaly review/disqualification.");
        }

        TetrisModerationStatus previousStatus = user.getTetrisModerationStatus() == null
                ? TetrisModerationStatus.NORMAL
                : user.getTetrisModerationStatus();

        if (previousStatus == nextStatus
                && ((user.getTetrisModerationReason() == null ? "" : user.getTetrisModerationReason().trim())
                .equals(nextStatus == TetrisModerationStatus.NORMAL ? "" : sanitizedReason))) {
            TetrisLeaderboard existingLeaderboard = tetrisLeaderboardRepository.findByPlayerNameIgnoreCase(user.getUsername()).orElse(null);
            Integer existingRank = existingLeaderboard == null ? null : rankByPlayerKey(user.getUsername());
            return toRegisteredPlayerResponse(user, existingLeaderboard, existingRank);
        }

        user.setTetrisModerationStatus(nextStatus);
        user.setTetrisModerationReason(nextStatus == TetrisModerationStatus.NORMAL ? null : sanitizedReason);
        user.setTetrisModeratedAt(nextStatus == TetrisModerationStatus.NORMAL ? null : Instant.now());

        AppUser savedUser = appUserRepository.save(user);

        String normalizedActor = actedBy == null || actedBy.trim().isEmpty() ? "SYSTEM" : actedBy.trim();
        TetrisModerationAuditLog auditLog = new TetrisModerationAuditLog();
        auditLog.setUserId(savedUser.getId());
        auditLog.setUsername(savedUser.getUsername());
        auditLog.setPreviousStatus(previousStatus);
        auditLog.setNewStatus(nextStatus);
        auditLog.setReason(nextStatus == TetrisModerationStatus.NORMAL ? (sanitizedReason.isEmpty() ? "Status restored to normal." : sanitizedReason) : sanitizedReason);
        auditLog.setActedBy(normalizedActor);
        auditLog.setActedAt(Instant.now());
        tetrisModerationAuditLogRepository.save(auditLog);

        if (nextStatus == TetrisModerationStatus.ANOMALY_REVIEW) {
            playerNotificationService.sendSystemNotification(
                    savedUser.getId(),
                    PlayerNotificationType.CUSTOM_MESSAGE,
                    "Tetris run flagged for review",
                    sanitizedReason
            );
        } else if (nextStatus.blocksGameplay()) {
            playerNotificationService.sendSystemNotification(
                    savedUser.getId(),
                    PlayerNotificationType.CUSTOM_MESSAGE,
                    "Tetris gameplay restricted",
                    sanitizedReason
            );
        } else {
            playerNotificationService.sendSystemNotification(
                    savedUser.getId(),
                    PlayerNotificationType.CUSTOM_MESSAGE,
                    "Tetris gameplay restored",
                    "Your account can access Tetris again. Please keep gameplay fair."
            );
        }

        TetrisLeaderboard leaderboard = tetrisLeaderboardRepository.findByPlayerNameIgnoreCase(savedUser.getUsername()).orElse(null);
        Integer rank = leaderboard == null ? null : rankByPlayerKey(savedUser.getUsername());
        return toRegisteredPlayerResponse(savedUser, leaderboard, rank);
    }

    @Transactional(readOnly = true)
    public List<TetrisModerationAuditLogResponse> getModerationHistory(Long userId) {
        return tetrisModerationAuditLogRepository.findByUserIdOrderByActedAtDesc(userId).stream()
                .map(log -> new TetrisModerationAuditLogResponse(
                        log.getId(),
                        log.getUserId(),
                        log.getUsername(),
                        log.getPreviousStatus() != null ? log.getPreviousStatus().name() : TetrisModerationStatus.NORMAL.name(),
                        log.getNewStatus() != null ? log.getNewStatus().name() : TetrisModerationStatus.NORMAL.name(),
                        log.getReason(),
                        log.getActedBy(),
                        log.getActedAt()
                ))
                .toList();
    }

    private Integer rankByPlayerKey(String username) {
        List<TetrisLeaderboard> leaderboardEntries = tetrisLeaderboardRepository.findAllByOrderByHighestScoreDesc();
        String key = normalizeKey(username);
        for (int index = 0; index < leaderboardEntries.size(); index++) {
            if (normalizeKey(leaderboardEntries.get(index).getPlayerName()).equals(key)) {
                return index + 1;
            }
        }
        return null;
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

     @Transactional
     public RegisteredPlayerResponse validateProfileImage(Long userId) {
         AppUser user = appUserRepository.findById(userId)
                 .orElseThrow(() -> new IllegalArgumentException("User not found"));

         user.setProfileImageValidated(true);
         user.setProfileImageValidationMessage(null);
         AppUser savedUser = appUserRepository.save(user);
         playerNotificationService.clearNotificationsByType(savedUser.getId(), PlayerNotificationType.PROFILE_IMAGE_REJECTED);

         TetrisLeaderboard leaderboard = tetrisLeaderboardRepository.findByPlayerNameIgnoreCase(savedUser.getUsername()).orElse(null);
         return toRegisteredPlayerResponse(savedUser, leaderboard, null);
     }

     @Transactional
     public RegisteredPlayerResponse rejectProfileImage(Long userId, String message) {
         AppUser user = appUserRepository.findById(userId)
                 .orElseThrow(() -> new IllegalArgumentException("User not found"));

         user.setProfileImageValidated(false);
         user.setProfileImageValidationMessage(message);
         AppUser savedUser = appUserRepository.save(user);
         playerNotificationService.clearNotificationsByType(savedUser.getId(), PlayerNotificationType.PROFILE_IMAGE_REJECTED);
         playerNotificationService.sendSystemNotification(
                 savedUser.getId(),
                 PlayerNotificationType.PROFILE_IMAGE_REJECTED,
                 "Profile image needs re-upload",
                 message
         );

         TetrisLeaderboard leaderboard = tetrisLeaderboardRepository.findByPlayerNameIgnoreCase(savedUser.getUsername()).orElse(null);
         return toRegisteredPlayerResponse(savedUser, leaderboard, null);
     }
}
