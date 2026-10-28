package com.solereax.inventory.settings;

import com.solereax.inventory.user.TetrisModerationStatus;

public record AdminPlayerModerationRequest(
        TetrisModerationStatus status,
        String reason
) {
}

