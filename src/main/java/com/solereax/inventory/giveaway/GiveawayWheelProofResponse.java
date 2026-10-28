package com.solereax.inventory.giveaway;

public record GiveawayWheelProofResponse(
        String imagePath,
        GiveawayWheelProofStatus status,
        String rejectionReason
) {
}
