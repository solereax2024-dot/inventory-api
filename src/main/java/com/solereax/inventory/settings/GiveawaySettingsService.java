package com.solereax.inventory.settings;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class GiveawaySettingsService {
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
                getSetting(GIVEAWAY_MODAL_PRIZE_IMAGE_URL_KEY, ""),
                getSetting(GIVEAWAY_MODAL_PRIZE_IMAGE_ALT_KEY, DEFAULT_PRIZE_IMAGE_ALT)
        );
    }

    @Transactional
    public GiveawaySettingsResponse updateSettings(GiveawaySettingsUpdateRequest request) {
        GiveawaySettingsUpdateRequest safeRequest = request == null
                ? new GiveawaySettingsUpdateRequest(null, null, null, null, null, null, null, null)
                : request;
        List<String> steps = normalizeSteps(safeRequest.steps());

        saveSetting(GIVEAWAY_MODAL_TITLE_KEY, normalizeOrDefault(safeRequest.title(), DEFAULT_TITLE));
        saveSetting(GIVEAWAY_MODAL_INTRO_KEY, normalizeOrDefault(safeRequest.intro(), DEFAULT_INTRO));
        saveSetting(GIVEAWAY_MODAL_HOW_TO_JOIN_TITLE_KEY, normalizeOrDefault(safeRequest.howToJoinTitle(), DEFAULT_HOW_TO_JOIN_TITLE));
        saveSetting(GIVEAWAY_MODAL_STEP_1_KEY, steps.get(0));
        saveSetting(GIVEAWAY_MODAL_STEP_2_KEY, steps.get(1));
        saveSetting(GIVEAWAY_MODAL_STEP_3_KEY, steps.get(2));
        saveSetting(GIVEAWAY_MODAL_STEP_4_KEY, steps.get(3));
        saveSetting(GIVEAWAY_MODAL_ACCOUNT_DELETION_NOTE_KEY, normalizeOrDefault(safeRequest.accountDeletionNote(), DEFAULT_ACCOUNT_DELETION_NOTE));
        saveSetting(GIVEAWAY_MODAL_PRIZE_LABEL_KEY, normalizeOrDefault(safeRequest.prizeLabel(), DEFAULT_PRIZE_LABEL));
        saveSetting(GIVEAWAY_MODAL_PRIZE_IMAGE_URL_KEY, normalizeOptional(safeRequest.prizeImageUrl()));
        saveSetting(GIVEAWAY_MODAL_PRIZE_IMAGE_ALT_KEY, normalizeOrDefault(safeRequest.prizeImageAlt(), DEFAULT_PRIZE_IMAGE_ALT));
        return getSettings();
    }

    @Transactional
    public String updatePrizeImageUrl(String prizeImageUrl) {
        return saveSetting(GIVEAWAY_MODAL_PRIZE_IMAGE_URL_KEY, normalizeOptional(prizeImageUrl));
    }

    private List<String> normalizeSteps(List<String> steps) {
        List<String> normalized = new ArrayList<>(DEFAULT_STEPS.size());
        for (int index = 0; index < DEFAULT_STEPS.size(); index++) {
            String fallback = DEFAULT_STEPS.get(index);
            String value = steps != null && index < steps.size() ? steps.get(index) : null;
            normalized.add(normalizeOrDefault(value, fallback));
        }
        return normalized;
    }

    private String getSetting(String key, String fallback) {
        return appSettingRepository.findById(key)
                .map(AppSetting::getSettingValue)
                .map(value -> value == null ? "" : value.trim())
                .filter(value -> !value.isEmpty())
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

    private String normalizeOrDefault(String value, String fallback) {
        String trimmed = value == null ? "" : value.trim();
        return trimmed.isEmpty() ? fallback : trimmed;
    }

    private String normalizeOptional(String value) {
        return value == null ? "" : value.trim();
    }
}

