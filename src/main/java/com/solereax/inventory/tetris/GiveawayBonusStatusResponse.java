package com.solereax.inventory.tetris;

public record GiveawayBonusStatusResponse(
        boolean followProofUploaded,
        String followProofImagePath,
        boolean followProofValidated,
        boolean followProofRevoked,
        String followProofValidationMessage,
        boolean reviewProofUploaded,
        String reviewProofImagePath,
        boolean reviewProofValidated,
        boolean reviewProofRevoked,
        String reviewProofValidationMessage,
        int followBonusPoints,
        int reviewBonusPoints,
        int totalBonusPoints
) {
}

