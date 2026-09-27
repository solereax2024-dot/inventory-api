package com.solereax.inventory.settings;

import java.time.Instant;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class GamingService {
    public static final String GAMING_SECTION_VISIBLE_KEY = "GAMING_SECTION_VISIBLE";

    private final AppSettingRepository appSettingRepository;

    public GamingService(AppSettingRepository appSettingRepository) {
        this.appSettingRepository = appSettingRepository;
    }

    @Transactional(readOnly = true)
    public boolean isGamingSectionVisible() {
        return appSettingRepository.findById(GAMING_SECTION_VISIBLE_KEY)
                .map(AppSetting::getSettingValue)
                .map(value -> !"false".equalsIgnoreCase(value.trim()))
                .orElse(false);
    }

    @Transactional
    public boolean updateGamingSectionVisible(boolean visible) {
        AppSetting setting = appSettingRepository.findById(GAMING_SECTION_VISIBLE_KEY)
                .orElseGet(() -> {
                    AppSetting created = new AppSetting();
                    created.setSettingKey(GAMING_SECTION_VISIBLE_KEY);
                    return created;
                });
        setting.setSettingValue(Boolean.toString(visible));
        setting.setUpdatedAt(Instant.now());
        appSettingRepository.save(setting);
        return visible;
    }
}

