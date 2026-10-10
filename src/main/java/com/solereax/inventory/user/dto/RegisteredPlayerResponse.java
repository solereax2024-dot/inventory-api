package com.solereax.inventory.user.dto;

import com.solereax.inventory.tetris.GiveawayBonusStatusResponse;
import java.time.Instant;
import java.time.LocalDateTime;

public record RegisteredPlayerResponse(
        Long id,
        String username,
        String fullName,
        String profileImagePath,
        boolean profileImageValidated,
        String profileImageValidationMessage,
        boolean facebookWinnerContactConsent,
        boolean enabled,
        Instant createdAt,
        Integer rank,
        Integer highestScore,
        Integer highestLevel,
        Integer totalGames,
        Integer totalLinesCleared,
        Integer totalBonusPoints,
        LocalDateTime lastPlayed,
        GiveawayBonusStatusResponse bonusStatus
) {
}

