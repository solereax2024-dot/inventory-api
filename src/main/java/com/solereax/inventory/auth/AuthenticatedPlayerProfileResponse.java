package com.solereax.inventory.auth;

public record AuthenticatedPlayerProfileResponse(
        String username,
        String fullName,
        String profileImagePath,
        boolean profileImageValidated,
        String profileImageValidationMessage
) {
}

