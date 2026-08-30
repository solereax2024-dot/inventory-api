package com.solereax.inventory.inventory.dto;

import jakarta.validation.constraints.Size;

public record TrackPublicViewRequest(
        @Size(max = 120) String sessionId,
        Long productId,
        @Size(max = 80) String colorwayKey
) {
}

