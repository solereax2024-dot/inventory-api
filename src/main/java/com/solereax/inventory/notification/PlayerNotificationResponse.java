package com.solereax.inventory.notification;

import java.time.Instant;

public record PlayerNotificationResponse(
        Long id,
        String type,
        String title,
        String message,
        boolean unread,
        Instant createdAt
) {
}

