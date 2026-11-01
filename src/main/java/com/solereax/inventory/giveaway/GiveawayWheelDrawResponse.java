package com.solereax.inventory.giveaway;

import java.time.Instant;

public record GiveawayWheelDrawResponse(
        Long drawId,
        Long winnerEntryId,
        String winnerFullName,
        String winnerProfileImagePath,
        int winnerEntryCount,
        boolean winnerRemovedFromWheel,
        String winnerMode,
        int eligibleEntryCount,
        int totalTickets,
        int winningTicketIndex,
        int winnerTicketOffset,
        String drawSnapshotHash,
        Instant drawnAt
) {
}

