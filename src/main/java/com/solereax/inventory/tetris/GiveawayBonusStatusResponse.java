package com.solereax.inventory.tetris;

public record GiveawayBonusStatusResponse(
        boolean followProofUploaded,
        String followProofImagePath,
        boolean followProofValidated,
        boolean followProofRevoked,
        boolean reviewProofUploaded,
        String reviewProofImagePath,
        boolean reviewProofValidated,
        boolean reviewProofRevoked,
        int followBonusPoints,
        int reviewBonusPoints,
        int totalBonusPoints
) {
}

