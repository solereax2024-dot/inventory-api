package com.solereax.inventory.settings;

import java.time.Instant;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BrandingService {
    public static final String SITE_LOGO_URL_KEY = "SITE_LOGO_URL";

    private final AppSettingRepository appSettingRepository;

    public BrandingService(AppSettingRepository appSettingRepository) {
        this.appSettingRepository = appSettingRepository;
    }

    @Transactional(readOnly = true)
    public String getLogoUrl() {
        return appSettingRepository.findById(SITE_LOGO_URL_KEY)
                .map(AppSetting::getSettingValue)
                .orElse(null);
    }

    @Transactional
    public String updateLogoUrl(String logoUrl) {
        AppSetting setting = appSettingRepository.findById(SITE_LOGO_URL_KEY)
                .orElseGet(() -> {
                    AppSetting created = new AppSetting();
                    created.setSettingKey(SITE_LOGO_URL_KEY);
                    return created;
                });
        setting.setSettingValue(logoUrl);
        setting.setUpdatedAt(Instant.now());
        return appSettingRepository.save(setting).getSettingValue();
    }
}
