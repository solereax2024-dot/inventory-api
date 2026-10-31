package com.solereax.inventory.giveaway;

import java.time.Instant;

public record GiveawayWheelEntryResponse(
        Long id,
        String fullName,
        String followProofImagePath,
        String commentProofImagePath,
        String shareProofImagePath,
        String reviewProofImagePath,
        String facebookProfileImagePath,
        int entryCount,
        int submittedEntryCount,
        boolean excludedFromWheel,
        boolean winner,
        Instant wonAt,
        String winMode,
        boolean passwordProtected,
        GiveawayWheelEntryStatus status,
        String rejectionReason,
        GiveawayWheelProofResponse followProof,
        GiveawayWheelProofResponse commentProof,
        GiveawayWheelProofResponse shareProof,
        GiveawayWheelProofResponse reviewProof,
        GiveawayWheelProofResponse facebookProfile,
        Instant createdAt,
        Instant updatedAt
) {
}

