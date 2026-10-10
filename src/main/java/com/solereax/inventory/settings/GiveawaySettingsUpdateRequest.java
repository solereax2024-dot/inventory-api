package com.solereax.inventory.settings;

import java.util.List;

public record GiveawaySettingsUpdateRequest(
        String title,
        String intro,
        String howToJoinTitle,
        List<String> steps,
        String accountDeletionNote,
        String leaderboardPrizeEyebrow,
        String prizeLabel,
        String leaderboardPrizeNote,
        String leaderboardGoalMessage,
        String prizeImageUrl,
        List<String> prizeImageUrls,
        Integer prizeImageCount,
        String prizeImageAlt
) {
}

