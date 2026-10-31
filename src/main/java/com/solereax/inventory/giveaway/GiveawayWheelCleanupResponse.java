package com.solereax.inventory.giveaway;

public record GiveawayWheelCleanupResponse(
        long deletedEntries,
        long deletedDrawHistory,
        long deletedUploadFiles
) {
}

