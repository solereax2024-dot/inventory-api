package com.solereax.inventory.payment;

import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.paymongo")
public record PayMongoProperties(
        boolean enabled,
        String apiBaseUrl,
        String secretKey,
        String webhookToken,
        String webhookSigningSecret,
        Integer webhookToleranceSeconds,
        String checkoutSuccessUrl,
        String checkoutCancelUrl,
        List<String> paymentMethodTypes
) {
    public List<String> resolvedPaymentMethodTypes() {
        if (paymentMethodTypes == null || paymentMethodTypes.isEmpty()) {
            return List.of("gcash", "paymaya", "card");
        }
        return paymentMethodTypes.stream()
                .filter(value -> value != null && !value.isBlank())
                .map(String::trim)
                .toList();
    }

    public String resolvedApiBaseUrl() {
        if (apiBaseUrl == null || apiBaseUrl.isBlank()) {
            return "https://api.paymongo.com/v1";
        }
        String trimmed = apiBaseUrl.trim();
        return trimmed.endsWith("/") ? trimmed.substring(0, trimmed.length() - 1) : trimmed;
    }

    public int resolvedWebhookToleranceSeconds() {
        if (webhookToleranceSeconds == null || webhookToleranceSeconds <= 0) {
            return 300;
        }
        return webhookToleranceSeconds;
    }
}

