package com.solereax.inventory.user.dto;

import com.solereax.inventory.tetris.GiveawayBonusStatusResponse;
import java.time.Instant;
import java.time.LocalDateTime;

public record RegisteredPlayerResponse(
        Long id,
        String username,
        String fullName,
        String profileImagePath,
        boolean facebookWinnerContactConsent,
        boolean enabled,
        Instant createdAt,
        Integer rank,
        Integer highestScore,
        Integer highestLevel,
        Integer totalGames,
        Integer totalLinesCleared,
        LocalDateTime lastPlayed,
        GiveawayBonusStatusResponse bonusStatus
) {
}

