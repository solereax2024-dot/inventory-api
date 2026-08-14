package com.solereax.inventory.auth;

public record LoginResponse(
        String token,
        String username,
        String role
) {
}
