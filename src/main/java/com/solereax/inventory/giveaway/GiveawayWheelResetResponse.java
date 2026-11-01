package com.solereax.inventory.giveaway;

public record GiveawayWheelResetResponse(
        String fullName,
        long resetEntryCount,
        long matchedEntryCount
) {
}

