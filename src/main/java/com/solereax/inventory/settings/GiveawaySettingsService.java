package com.solereax.inventory.settings;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class GiveawaySettingsService {
    private static final int MAX_PRIZE_IMAGES = 10;
    public static final String GIVEAWAY_MODAL_TITLE_KEY = "GIVEAWAY_MODAL_TITLE";
    public static final String GIVEAWAY_MODAL_INTRO_KEY = "GIVEAWAY_MODAL_INTRO";
    public static final String GIVEAWAY_MODAL_HOW_TO_JOIN_TITLE_KEY = "GIVEAWAY_MODAL_HOW_TO_JOIN_TITLE";
    public static final String GIVEAWAY_MODAL_STEP_1_KEY = "GIVEAWAY_MODAL_STEP_1";
    public static final String GIVEAWAY_MODAL_STEP_2_KEY = "GIVEAWAY_MODAL_STEP_2";
    public static final String GIVEAWAY_MODAL_STEP_3_KEY = "GIVEAWAY_MODAL_STEP_3";
    public static final String GIVEAWAY_MODAL_STEP_4_KEY = "GIVEAWAY_MODAL_STEP_4";
    public static final String GIVEAWAY_MODAL_ACCOUNT_DELETION_NOTE_KEY = "GIVEAWAY_MODAL_ACCOUNT_DELETION_NOTE";
    public static final String GIVEAWAY_MODAL_PRIZE_LABEL_KEY = "GIVEAWAY_MODAL_PRIZE_LABEL";
    public static final String GIVEAWAY_MODAL_PRIZE_IMAGE_URL_KEY = "GIVEAWAY_MODAL_PRIZE_IMAGE_URL";
    public static final String GIVEAWAY_MODAL_PRIZE_IMAGE_URLS_KEY = "GIVEAWAY_MODAL_PRIZE_IMAGE_URLS";
    public static final String GIVEAWAY_MODAL_PRIZE_IMAGE_COUNT_KEY = "GIVEAWAY_MODAL_PRIZE_IMAGE_COUNT";
    public static final String GIVEAWAY_MODAL_PRIZE_IMAGE_ALT_KEY = "GIVEAWAY_MODAL_PRIZE_IMAGE_ALT";

    private static final String DEFAULT_TITLE = "Join the Giveaway";
    private static final String DEFAULT_INTRO = "Play the Giveaway challenge for a chance to win. Before you continue, please confirm that you follow our page and can upload proof.";
    private static final String DEFAULT_HOW_TO_JOIN_TITLE = "How to Join";
    private static final String DEFAULT_ACCOUNT_DELETION_NOTE = "After the giveaway ends, giveaway accounts will be deleted and you will no longer be able to access the game using that account.";
    private static final String DEFAULT_PRIZE_LABEL = "Featured Prize";
    private static final String DEFAULT_PRIZE_IMAGE_ALT = "Featured giveaway prize";
    private static final List<String> DEFAULT_STEPS = List.of(
            "Play the Giveaway challenge for a chance to win our featured prize.",
            "You must be following our official page.",
            "You will upload a screenshot showing that you follow us.",
            "If you win, we may contact you using the follower details shown in your submitted screenshot."
    );

    private final AppSettingRepository appSettingRepository;

    public GiveawaySettingsService(AppSettingRepository appSettingRepository) {
        this.appSettingRepository = appSettingRepository;
    }

    @Transactional(readOnly = true)
    public GiveawaySettingsResponse getSettings() {
        String primaryPrizeImageUrl = getSetting(GIVEAWAY_MODAL_PRIZE_IMAGE_URL_KEY, "");
        List<String> prizeImageUrls = normalizePrizeImageUrls(getOptionalListSetting(GIVEAWAY_MODAL_PRIZE_IMAGE_URLS_KEY), primaryPrizeImageUrl);
        int prizeImageCount = normalizePrizeImageCount(getOptionalIntegerSetting(GIVEAWAY_MODAL_PRIZE_IMAGE_COUNT_KEY), prizeImageUrls.size());
        return new GiveawaySettingsResponse(
                getSetting(GIVEAWAY_MODAL_TITLE_KEY, DEFAULT_TITLE),
                getSetting(GIVEAWAY_MODAL_INTRO_KEY, DEFAULT_INTRO),
                getSetting(GIVEAWAY_MODAL_HOW_TO_JOIN_TITLE_KEY, DEFAULT_HOW_TO_JOIN_TITLE),
                List.of(
                        getSetting(GIVEAWAY_MODAL_STEP_1_KEY, DEFAULT_STEPS.get(0)),
                        getSetting(GIVEAWAY_MODAL_STEP_2_KEY, DEFAULT_STEPS.get(1)),
                        getSetting(GIVEAWAY_MODAL_STEP_3_KEY, DEFAULT_STEPS.get(2)),
                        getSetting(GIVEAWAY_MODAL_STEP_4_KEY, DEFAULT_STEPS.get(3))
                ),
                getSetting(GIVEAWAY_MODAL_ACCOUNT_DELETION_NOTE_KEY, DEFAULT_ACCOUNT_DELETION_NOTE),
                getSetting(GIVEAWAY_MODAL_PRIZE_LABEL_KEY, DEFAULT_PRIZE_LABEL),
                prizeImageUrls.isEmpty() ? primaryPrizeImageUrl : prizeImageUrls.getFirst(),
                prizeImageUrls,
                prizeImageCount,
                getSetting(GIVEAWAY_MODAL_PRIZE_IMAGE_ALT_KEY, DEFAULT_PRIZE_IMAGE_ALT)
        );
    }

    @Transactional
    public GiveawaySettingsResponse updateSettings(GiveawaySettingsUpdateRequest request) {
        GiveawaySettingsUpdateRequest safeRequest = request == null
                ? new GiveawaySettingsUpdateRequest(null, null, null, null, null, null, null, null, null, null)
                : request;
        List<String> steps = normalizeSteps(safeRequest.steps());
        List<String> normalizedPrizeImageUrls = normalizePrizeImageUrls(safeRequest.prizeImageUrls(), safeRequest.prizeImageUrl());
        int prizeImageCount = normalizePrizeImageCount(safeRequest.prizeImageCount(), normalizedPrizeImageUrls.size());
        List<String> prizeImageUrls = normalizedPrizeImageUrls.stream()
                .limit(prizeImageCount)
                .toList();

        saveSetting(GIVEAWAY_MODAL_TITLE_KEY, normalizeText(safeRequest.title()));
        saveSetting(GIVEAWAY_MODAL_INTRO_KEY, normalizeText(safeRequest.intro()));
        saveSetting(GIVEAWAY_MODAL_HOW_TO_JOIN_TITLE_KEY, normalizeText(safeRequest.howToJoinTitle()));
        saveSetting(GIVEAWAY_MODAL_STEP_1_KEY, steps.get(0));
        saveSetting(GIVEAWAY_MODAL_STEP_2_KEY, steps.get(1));
        saveSetting(GIVEAWAY_MODAL_STEP_3_KEY, steps.get(2));
        saveSetting(GIVEAWAY_MODAL_STEP_4_KEY, steps.get(3));
        saveSetting(GIVEAWAY_MODAL_ACCOUNT_DELETION_NOTE_KEY, normalizeText(safeRequest.accountDeletionNote()));
        saveSetting(GIVEAWAY_MODAL_PRIZE_LABEL_KEY, normalizeText(safeRequest.prizeLabel()));
        saveSetting(GIVEAWAY_MODAL_PRIZE_IMAGE_URL_KEY, prizeImageUrls.isEmpty() ? "" : prizeImageUrls.getFirst());
        saveSetting(GIVEAWAY_MODAL_PRIZE_IMAGE_URLS_KEY, serializeList(prizeImageUrls));
        saveSetting(GIVEAWAY_MODAL_PRIZE_IMAGE_COUNT_KEY, String.valueOf(prizeImageCount));
        saveSetting(GIVEAWAY_MODAL_PRIZE_IMAGE_ALT_KEY, normalizeText(safeRequest.prizeImageAlt()));
        return getSettings();
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

    private List<String> getOptionalListSetting(String key) {
        String rawValue = appSettingRepository.findById(key)
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

    private Integer getOptionalIntegerSetting(String key) {
        String rawValue = appSettingRepository.findById(key)
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

    private String getSetting(String key, String fallback) {
        return appSettingRepository.findById(key)
                .map(AppSetting::getSettingValue)
                .map(value -> value == null ? "" : value.trim())
                .orElse(fallback);
    }

    private String saveSetting(String key, String value) {
        AppSetting setting = appSettingRepository.findById(key)
                .orElseGet(() -> {
                    AppSetting created = new AppSetting();
                    created.setSettingKey(key);
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
}

