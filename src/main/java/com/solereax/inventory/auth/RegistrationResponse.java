package com.solereax.inventory.auth;

public record RegistrationResponse(
        String message,
        String username,
        String fullName,
        String token,
        String role,
        String profileImagePath
) {
}

