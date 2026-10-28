package com.solereax.inventory.settings;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class GiveawaySettingsService {
    private static final int MAX_PRIZE_IMAGES = 10;
    private static final long DEFAULT_GIVEAWAY_ID = 1L;
    public static final String GIVEAWAY_MODAL_TITLE_KEY = "GIVEAWAY_MODAL_TITLE";
    public static final String GIVEAWAY_MODAL_INTRO_KEY = "GIVEAWAY_MODAL_INTRO";
    public static final String GIVEAWAY_MODAL_HOW_TO_JOIN_TITLE_KEY = "GIVEAWAY_MODAL_HOW_TO_JOIN_TITLE";
    public static final String GIVEAWAY_MODAL_STEP_1_KEY = "GIVEAWAY_MODAL_STEP_1";
    public static final String GIVEAWAY_MODAL_STEP_2_KEY = "GIVEAWAY_MODAL_STEP_2";
    public static final String GIVEAWAY_MODAL_STEP_3_KEY = "GIVEAWAY_MODAL_STEP_3";
    public static final String GIVEAWAY_MODAL_STEP_4_KEY = "GIVEAWAY_MODAL_STEP_4";
    public static final String GIVEAWAY_MODAL_ACCOUNT_DELETION_NOTE_KEY = "GIVEAWAY_MODAL_ACCOUNT_DELETION_NOTE";
    public static final String GIVEAWAY_LEADERBOARD_PRIZE_EYEBROW_KEY = "GIVEAWAY_LEADERBOARD_PRIZE_EYEBROW";
    public static final String GIVEAWAY_MODAL_PRIZE_LABEL_KEY = "GIVEAWAY_MODAL_PRIZE_LABEL";
    public static final String GIVEAWAY_LEADERBOARD_PRIZE_NOTE_KEY = "GIVEAWAY_LEADERBOARD_PRIZE_NOTE";
    public static final String GIVEAWAY_LEADERBOARD_GOAL_MESSAGE_KEY = "GIVEAWAY_LEADERBOARD_GOAL_MESSAGE";
    public static final String GIVEAWAY_MODAL_PRIZE_IMAGE_URL_KEY = "GIVEAWAY_MODAL_PRIZE_IMAGE_URL";
    public static final String GIVEAWAY_MODAL_PRIZE_IMAGE_URLS_KEY = "GIVEAWAY_MODAL_PRIZE_IMAGE_URLS";
    public static final String GIVEAWAY_MODAL_PRIZE_IMAGE_COUNT_KEY = "GIVEAWAY_MODAL_PRIZE_IMAGE_COUNT";
    public static final String GIVEAWAY_MODAL_PRIZE_IMAGE_ALT_KEY = "GIVEAWAY_MODAL_PRIZE_IMAGE_ALT";

    private static final String DEFAULT_TITLE = "Join the Giveaway";
    private static final String DEFAULT_INTRO = "Play the Giveaway challenge for a chance to win. Before you continue, please confirm that you follow our page and can upload proof.";
    private static final String DEFAULT_HOW_TO_JOIN_TITLE = "How to Join";
    private static final String DEFAULT_ACCOUNT_DELETION_NOTE = "After the giveaway ends, giveaway accounts will be deleted and you will no longer be able to access the game using that account.";
    private static final String DEFAULT_LEADERBOARD_PRIZE_EYEBROW = "Prize to Win";
    private static final String DEFAULT_PRIZE_LABEL = "Featured Prize";
    private static final String DEFAULT_LEADERBOARD_PRIZE_NOTE = "Climb to No. 1 to claim this prize.";
    private static final String DEFAULT_LEADERBOARD_GOAL_MESSAGE = "Win by reaching No. 1 on the leaderboard!";
    private static final String DEFAULT_PRIZE_IMAGE_ALT = "Featured giveaway prize";
    private static final List<String> DEFAULT_STEPS = List.of(
            "Play the Giveaway challenge for a chance to win our featured prize.",
            "You must be following our official page.",
            "You will upload a screenshot showing that you follow us.",
            "If you win, we may contact you using the follower details shown in your submitted screenshot."
    );
    private static final String WHEEL_DEFAULT_TITLE = "Join";
    private static final String WHEEL_DEFAULT_HOW_TO_JOIN_TITLE = "Join";
    private static final String WHEEL_DEFAULT_INTRO = "Submit your entry.";
    private static final String WHEEL_DEFAULT_ACCOUNT_DELETION_NOTE = "Search";
    private static final String WHEEL_DEFAULT_PRIZE_EYEBROW = "Prize";
    private static final String WHEEL_DEFAULT_PRIZE_LABEL = "Prize";
    private static final String WHEEL_DEFAULT_PRIZE_NOTE = "Featured Prize";
    private static final String WHEEL_DEFAULT_GOAL_MESSAGE = "Search";
    private static final List<String> WHEEL_DEFAULT_STEPS = List.of(
            "Check your status.",
            "",
            "",
            ""
    );

    private final AppSettingRepository appSettingRepository;

    public GiveawaySettingsService(AppSettingRepository appSettingRepository) {
        this.appSettingRepository = appSettingRepository;
    }

    @Transactional(readOnly = true)
    public GiveawaySettingsResponse getSettings() {
        return getSettings(DEFAULT_GIVEAWAY_ID);
    }

    @Transactional(readOnly = true)
    public GiveawaySettingsResponse getSettings(Long giveawayId) {
        long normalizedGiveawayId = normalizeGiveawayId(giveawayId);
        String primaryPrizeImageUrl = getSetting(normalizedGiveawayId, GIVEAWAY_MODAL_PRIZE_IMAGE_URL_KEY, "");
        List<String> prizeImageUrls = normalizePrizeImageUrls(getOptionalListSetting(normalizedGiveawayId, GIVEAWAY_MODAL_PRIZE_IMAGE_URLS_KEY), primaryPrizeImageUrl);
        int prizeImageCount = normalizePrizeImageCount(getOptionalIntegerSetting(normalizedGiveawayId, GIVEAWAY_MODAL_PRIZE_IMAGE_COUNT_KEY), prizeImageUrls.size());
        List<String> defaultSteps = defaultStepsForGiveaway(normalizedGiveawayId);
        return new GiveawaySettingsResponse(
                getSetting(normalizedGiveawayId, GIVEAWAY_MODAL_TITLE_KEY, defaultTitleForGiveaway(normalizedGiveawayId)),
                getSetting(normalizedGiveawayId, GIVEAWAY_MODAL_INTRO_KEY, defaultIntroForGiveaway(normalizedGiveawayId)),
                getSetting(normalizedGiveawayId, GIVEAWAY_MODAL_HOW_TO_JOIN_TITLE_KEY, defaultHowToJoinTitleForGiveaway(normalizedGiveawayId)),
                List.of(
                        getSetting(normalizedGiveawayId, GIVEAWAY_MODAL_STEP_1_KEY, defaultSteps.get(0)),
                        getSetting(normalizedGiveawayId, GIVEAWAY_MODAL_STEP_2_KEY, defaultSteps.get(1)),
                        getSetting(normalizedGiveawayId, GIVEAWAY_MODAL_STEP_3_KEY, defaultSteps.get(2)),
                        getSetting(normalizedGiveawayId, GIVEAWAY_MODAL_STEP_4_KEY, defaultSteps.get(3))
                ),
                getSetting(normalizedGiveawayId, GIVEAWAY_MODAL_ACCOUNT_DELETION_NOTE_KEY, defaultAccountDeletionNoteForGiveaway(normalizedGiveawayId)),
                getSetting(normalizedGiveawayId, GIVEAWAY_LEADERBOARD_PRIZE_EYEBROW_KEY, defaultPrizeEyebrowForGiveaway(normalizedGiveawayId)),
                getSetting(normalizedGiveawayId, GIVEAWAY_MODAL_PRIZE_LABEL_KEY, defaultPrizeLabelForGiveaway(normalizedGiveawayId)),
                getSetting(normalizedGiveawayId, GIVEAWAY_LEADERBOARD_PRIZE_NOTE_KEY, defaultPrizeNoteForGiveaway(normalizedGiveawayId)),
                getSetting(normalizedGiveawayId, GIVEAWAY_LEADERBOARD_GOAL_MESSAGE_KEY, defaultGoalMessageForGiveaway(normalizedGiveawayId)),
                prizeImageUrls.isEmpty() ? primaryPrizeImageUrl : prizeImageUrls.getFirst(),
                prizeImageUrls,
                prizeImageCount,
                getSetting(normalizedGiveawayId, GIVEAWAY_MODAL_PRIZE_IMAGE_ALT_KEY, DEFAULT_PRIZE_IMAGE_ALT)
        );
    }

    @Transactional
    public GiveawaySettingsResponse updateSettings(GiveawaySettingsUpdateRequest request) {
        return updateSettings(DEFAULT_GIVEAWAY_ID, request);
    }

    @Transactional
    public GiveawaySettingsResponse updateSettings(Long giveawayId, GiveawaySettingsUpdateRequest request) {
        long normalizedGiveawayId = normalizeGiveawayId(giveawayId);
        GiveawaySettingsUpdateRequest safeRequest = request == null
                ? new GiveawaySettingsUpdateRequest(null, null, null, null, null, null, null, null, null, null, null, null, null)
                : request;
        List<String> steps = normalizeSteps(safeRequest.steps());
        List<String> normalizedPrizeImageUrls = normalizePrizeImageUrls(safeRequest.prizeImageUrls(), safeRequest.prizeImageUrl());
        int prizeImageCount = normalizePrizeImageCount(safeRequest.prizeImageCount(), normalizedPrizeImageUrls.size());
        List<String> prizeImageUrls = normalizedPrizeImageUrls.stream()
                .limit(prizeImageCount)
                .toList();

        saveSetting(normalizedGiveawayId, GIVEAWAY_MODAL_TITLE_KEY, normalizeText(safeRequest.title()));
        saveSetting(normalizedGiveawayId, GIVEAWAY_MODAL_INTRO_KEY, normalizeText(safeRequest.intro()));
        saveSetting(normalizedGiveawayId, GIVEAWAY_MODAL_HOW_TO_JOIN_TITLE_KEY, normalizeText(safeRequest.howToJoinTitle()));
        saveSetting(normalizedGiveawayId, GIVEAWAY_MODAL_STEP_1_KEY, steps.get(0));
        saveSetting(normalizedGiveawayId, GIVEAWAY_MODAL_STEP_2_KEY, steps.get(1));
        saveSetting(normalizedGiveawayId, GIVEAWAY_MODAL_STEP_3_KEY, steps.get(2));
        saveSetting(normalizedGiveawayId, GIVEAWAY_MODAL_STEP_4_KEY, steps.get(3));
        saveSetting(normalizedGiveawayId, GIVEAWAY_MODAL_ACCOUNT_DELETION_NOTE_KEY, normalizeText(safeRequest.accountDeletionNote()));
        saveSetting(normalizedGiveawayId, GIVEAWAY_LEADERBOARD_PRIZE_EYEBROW_KEY, normalizeText(safeRequest.leaderboardPrizeEyebrow()));
        saveSetting(normalizedGiveawayId, GIVEAWAY_MODAL_PRIZE_LABEL_KEY, normalizeText(safeRequest.prizeLabel()));
        saveSetting(normalizedGiveawayId, GIVEAWAY_LEADERBOARD_PRIZE_NOTE_KEY, normalizeText(safeRequest.leaderboardPrizeNote()));
        saveSetting(normalizedGiveawayId, GIVEAWAY_LEADERBOARD_GOAL_MESSAGE_KEY, normalizeText(safeRequest.leaderboardGoalMessage()));
        saveSetting(normalizedGiveawayId, GIVEAWAY_MODAL_PRIZE_IMAGE_URL_KEY, prizeImageUrls.isEmpty() ? "" : prizeImageUrls.getFirst());
        saveSetting(normalizedGiveawayId, GIVEAWAY_MODAL_PRIZE_IMAGE_URLS_KEY, serializeList(prizeImageUrls));
        saveSetting(normalizedGiveawayId, GIVEAWAY_MODAL_PRIZE_IMAGE_COUNT_KEY, String.valueOf(prizeImageCount));
        saveSetting(normalizedGiveawayId, GIVEAWAY_MODAL_PRIZE_IMAGE_ALT_KEY, normalizeText(safeRequest.prizeImageAlt()));
        return getSettings(normalizedGiveawayId);
    }

    private List<String> normalizeSteps(List<String> steps) {
        List<String> normalized = new ArrayList<>(DEFAULT_STEPS.size());
        for (int index = 0; index < DEFAULT_STEPS.size(); index++) {
            String value = steps != null && index < steps.size() ? steps.get(index) : null;
            normalized.add(normalizeText(value));
        }
        return normalized;
    }

    private List<String> normalizePrizeImageUrls(List<String> prizeImageUrls, String singlePrizeImageUrl) {
        List<String> normalized = new ArrayList<>();
        if (prizeImageUrls != null) {
            for (String prizeImageUrl : prizeImageUrls) {
                String normalizedUrl = normalizeOptional(prizeImageUrl);
                if (!normalizedUrl.isEmpty()) {
                    normalized.add(normalizedUrl);
                }
                if (normalized.size() >= MAX_PRIZE_IMAGES) {
                    break;
                }
            }
        }

        if (normalized.isEmpty()) {
            String fallbackImageUrl = normalizeOptional(singlePrizeImageUrl);
            if (!fallbackImageUrl.isEmpty()) {
                normalized.add(fallbackImageUrl);
            }
        }

        return normalized;
    }

    private int normalizePrizeImageCount(Integer requestedCount, int populatedImageCount) {
        int fallback = Math.max(populatedImageCount, 1);
        int resolved = requestedCount != null ? requestedCount : fallback;
        return Math.max(1, Math.min(MAX_PRIZE_IMAGES, resolved));
    }

    private List<String> getOptionalListSetting(long giveawayId, String key) {
        String rawValue = appSettingRepository.findById(keyForGiveaway(giveawayId, key))
                .map(AppSetting::getSettingValue)
                .orElse("");
        if (rawValue == null || rawValue.isBlank()) {
            return List.of();
        }

        return rawValue.lines()
                .map(this::normalizeOptional)
                .filter(value -> !value.isEmpty())
                .limit(MAX_PRIZE_IMAGES)
                .toList();
    }

    private Integer getOptionalIntegerSetting(long giveawayId, String key) {
        String rawValue = appSettingRepository.findById(keyForGiveaway(giveawayId, key))
                .map(AppSetting::getSettingValue)
                .orElse("");
        if (rawValue == null || rawValue.isBlank()) {
            return null;
        }

        try {
            return Integer.parseInt(rawValue.trim());
        } catch (NumberFormatException exception) {
            return null;
        }
    }

    private String serializeList(List<String> values) {
        return values == null ? "" : values.stream()
                .map(this::normalizeOptional)
                .filter(value -> !value.isEmpty())
                .limit(MAX_PRIZE_IMAGES)
                .reduce((left, right) -> left + "\n" + right)
                .orElse("");
    }

    private String getSetting(long giveawayId, String key, String fallback) {
        return appSettingRepository.findById(keyForGiveaway(giveawayId, key))
                .map(AppSetting::getSettingValue)
                .map(value -> value == null ? "" : value.trim())
                .orElse(fallback);
    }

    private String saveSetting(long giveawayId, String key, String value) {
        String namespacedKey = keyForGiveaway(giveawayId, key);
        AppSetting setting = appSettingRepository.findById(namespacedKey)
                .orElseGet(() -> {
                    AppSetting created = new AppSetting();
                    created.setSettingKey(namespacedKey);
                    return created;
                });
        setting.setSettingValue(value == null ? "" : value.trim());
        setting.setUpdatedAt(Instant.now());
        return appSettingRepository.save(setting).getSettingValue();
    }

    private String normalizeText(String value) {
        String trimmed = value == null ? "" : value.trim();
        return trimmed;
    }

    private String normalizeOptional(String value) {
        return value == null ? "" : value.trim();
    }

    private long normalizeGiveawayId(Long giveawayId) {
        return giveawayId == null || giveawayId < 1 ? DEFAULT_GIVEAWAY_ID : giveawayId;
    }

    private String keyForGiveaway(long giveawayId, String key) {
        if (giveawayId <= DEFAULT_GIVEAWAY_ID) {
            return key;
        }
        return "G" + giveawayId + "_" + key;
    }

    private String defaultTitleForGiveaway(long giveawayId) {
        return giveawayId == 2L ? WHEEL_DEFAULT_TITLE : DEFAULT_TITLE;
    }

    private String defaultIntroForGiveaway(long giveawayId) {
        return giveawayId == 2L ? WHEEL_DEFAULT_INTRO : DEFAULT_INTRO;
    }

    private String defaultHowToJoinTitleForGiveaway(long giveawayId) {
        return giveawayId == 2L ? WHEEL_DEFAULT_HOW_TO_JOIN_TITLE : DEFAULT_HOW_TO_JOIN_TITLE;
    }

    private String defaultAccountDeletionNoteForGiveaway(long giveawayId) {
        return giveawayId == 2L ? WHEEL_DEFAULT_ACCOUNT_DELETION_NOTE : DEFAULT_ACCOUNT_DELETION_NOTE;
    }

    private String defaultPrizeEyebrowForGiveaway(long giveawayId) {
        return giveawayId == 2L ? WHEEL_DEFAULT_PRIZE_EYEBROW : DEFAULT_LEADERBOARD_PRIZE_EYEBROW;
    }

    private String defaultPrizeLabelForGiveaway(long giveawayId) {
        return giveawayId == 2L ? WHEEL_DEFAULT_PRIZE_LABEL : DEFAULT_PRIZE_LABEL;
    }

    private String defaultPrizeNoteForGiveaway(long giveawayId) {
        return giveawayId == 2L ? WHEEL_DEFAULT_PRIZE_NOTE : DEFAULT_LEADERBOARD_PRIZE_NOTE;
    }

    private String defaultGoalMessageForGiveaway(long giveawayId) {
        return giveawayId == 2L ? WHEEL_DEFAULT_GOAL_MESSAGE : DEFAULT_LEADERBOARD_GOAL_MESSAGE;
    }

    private List<String> defaultStepsForGiveaway(long giveawayId) {
        return giveawayId == 2L ? WHEEL_DEFAULT_STEPS : DEFAULT_STEPS;
    }
}

