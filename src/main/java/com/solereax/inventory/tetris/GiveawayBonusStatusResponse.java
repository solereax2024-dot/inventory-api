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
        boolean commentProofUploaded,
        String commentProofImagePath,
        boolean commentProofValidated,
        boolean commentProofRevoked,
        String commentProofValidationMessage,
        int followBonusPoints,
        int reviewBonusPoints,
        int totalBonusPoints
) {
}

