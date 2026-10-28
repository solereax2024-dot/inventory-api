package com.solereax.inventory.giveaway;

enum GiveawayWheelProofType {
    FOLLOW("Following", GiveawayWheelService.FOLLOW_ENTRY_COUNT),
    COMMENT("Tag Friend", GiveawayWheelService.COMMENT_ENTRY_COUNT),
    SHARE("Share Post", GiveawayWheelService.SHARE_ENTRY_COUNT),
    REVIEW("Review", GiveawayWheelService.REVIEW_ENTRY_COUNT),
    FACEBOOK_PROFILE("FB Profile", 0);

    private final String label;
    private final int entryWeight;

    GiveawayWheelProofType(String label, int entryWeight) {
        this.label = label;
        this.entryWeight = entryWeight;
    }

    String label() {
        return label;
    }

    int entryWeight() {
        return entryWeight;
    }

    boolean countsTowardWheelSlots() {
        return entryWeight > 0;
    }

    static GiveawayWheelProofType from(String value) {
        String normalized = value == null ? "" : value.trim().toLowerCase();
        return switch (normalized) {
            case "follow", "following" -> FOLLOW;
            case "comment", "tag", "tag-friend", "tagfriend" -> COMMENT;
            case "share", "shared", "share-post", "sharepost" -> SHARE;
            case "review" -> REVIEW;
            case "facebook", "facebook-profile", "facebookprofile", "fb-profile", "profile" -> FACEBOOK_PROFILE;
            default -> throw new IllegalArgumentException("Unsupported giveaway proof type: " + value);
        };
    }
}
