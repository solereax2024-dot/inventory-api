package com.solereax.inventory.settings;

import java.util.List;

public record GiveawaySettingsResponse(
        String title,
        String intro,
        String howToJoinTitle,
        List<String> steps,
        String accountDeletionNote,
        String prizeLabel,
        String prizeImageUrl,
        List<String> prizeImageUrls,
        Integer prizeImageCount,
        String prizeImageAlt
) {
}

