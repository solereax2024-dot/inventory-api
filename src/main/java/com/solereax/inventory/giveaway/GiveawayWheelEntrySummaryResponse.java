package com.solereax.inventory.giveaway;

import java.time.Instant;

public record GiveawayWheelEntrySummaryResponse(
        Long id,
        String fullName,
        int entryCount,
        int submittedEntryCount,
        boolean excludedFromWheel,
        boolean winner,
        Instant wonAt,
        String winMode,
        boolean passwordProtected,
        GiveawayWheelEntryStatus status,
        String rejectionReason,
        String sourceTag,
        GiveawayWheelProofResponse followProof,
        GiveawayWheelProofResponse commentProof,
        GiveawayWheelProofResponse shareProof,
        GiveawayWheelProofResponse reviewProof,
        GiveawayWheelProofResponse facebookProfile,
        Instant updatedAt
) {
}

