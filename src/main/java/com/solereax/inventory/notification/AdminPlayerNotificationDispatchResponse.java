package com.solereax.inventory.notification;

public record AdminPlayerNotificationDispatchResponse(
        String message,
        int deliveredCount
) {
}

