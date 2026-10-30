package com.solereax.inventory.settings;

import java.time.Instant;

public record TetrisModerationAuditLogResponse(
        Long id,
        Long userId,
        String username,
        String previousStatus,
        String newStatus,
        String reason,
        String evidenceSnapshot,
        String actedBy,
        Instant actedAt
) {
}

