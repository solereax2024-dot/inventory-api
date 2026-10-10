package com.solereax.inventory.settings;

import java.util.List;

public record GiveawaySettingsUpdateRequest(
        String title,
        String intro,
        String howToJoinTitle,
        List<String> steps,
        String accountDeletionNote,
        String prizeLabel,
        String prizeImageUrl,
        String prizeImageAlt
) {
}

