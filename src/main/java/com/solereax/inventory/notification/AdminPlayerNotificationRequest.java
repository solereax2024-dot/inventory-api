package com.solereax.inventory.notification;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AdminPlayerNotificationRequest(
        @NotBlank(message = "Title is required")
        @Size(max = 255, message = "Title must be 255 characters or less")
        String title,
        @NotBlank(message = "Message is required")
        @Size(max = 1000, message = "Message must be 1000 characters or less")
        String message
) {
}

