package com.solereax.inventory.giveaway;

import java.time.Instant;

public record GiveawayWheelEntrySummaryResponse(
        Long id,
        String fullName,
        int entryCount,
        int submittedEntryCount,
        GiveawayWheelEntryStatus status,
        String rejectionReason,
        GiveawayWheelProofResponse followProof,
        GiveawayWheelProofResponse commentProof,
        GiveawayWheelProofResponse shareProof,
        GiveawayWheelProofResponse reviewProof,
        GiveawayWheelProofResponse facebookProfile,
        Instant updatedAt
) {
}

