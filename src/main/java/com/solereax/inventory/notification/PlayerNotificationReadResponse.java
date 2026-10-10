package com.solereax.inventory.notification;

public record PlayerNotificationReadResponse(
        String message,
        int updatedCount
) {
}

