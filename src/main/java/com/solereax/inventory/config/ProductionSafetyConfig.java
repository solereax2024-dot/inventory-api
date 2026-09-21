package com.solereax.inventory.config;

import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.util.StringUtils;

@Configuration
public class ProductionSafetyConfig {

    @Bean
    ApplicationRunner verifyProductionDatabaseConfiguration(
            Environment environment,
            @Value("${app.safety.production-mode:false}") boolean productionMode,
            @Value("${app.safety.allowed-production-databases:inventory}") String allowedProductionDatabases,
            @Value("${spring.datasource.url:}") String datasourceUrl
    ) {
        return args -> validateProductionDatabaseConfiguration(
                productionMode,
                datasourceUrl,
                environment.getProperty("DB_URL"),
                parseAllowedDatabaseNames(allowedProductionDatabases)
        );
    }

    static void validateProductionDatabaseConfiguration(
            boolean productionMode,
            String datasourceUrl,
            String explicitDbUrl,
            List<String> allowedDatabaseNames
    ) {
        if (!productionMode) {
            return;
        }

        if (!StringUtils.hasText(explicitDbUrl)) {
            throw new IllegalStateException(
                    "Production mode requires DB_URL to be set explicitly. Refusing to start with fallback datasource URL: "
                            + datasourceUrl
            );
        }

        Set<String> allowed = allowedDatabaseNames.stream()
                .map(String::trim)
                .filter(StringUtils::hasText)
                .map(name -> name.toLowerCase(Locale.ROOT))
                .collect(Collectors.toUnmodifiableSet());

        if (allowed.isEmpty()) {
            throw new IllegalStateException("No allowed production database names are configured.");
        }

        String databaseName = extractDatabaseName(datasourceUrl);
        if (!StringUtils.hasText(databaseName)) {
            throw new IllegalStateException("Could not determine database name from datasource URL: " + datasourceUrl);
        }

        String normalizedDatabaseName = databaseName.toLowerCase(Locale.ROOT);
        if (!allowed.contains(normalizedDatabaseName)) {
            throw new IllegalStateException(
                    "Refusing to start in production against database '"
                            + databaseName
                            + "'. Allowed production databases: "
                            + allowed
            );
        }
    }

    static List<String> parseAllowedDatabaseNames(String rawValue) {
        if (!StringUtils.hasText(rawValue)) {
            return List.of();
        }
        return List.of(rawValue.split(","));
    }

    static String extractDatabaseName(String jdbcUrl) {
        if (!StringUtils.hasText(jdbcUrl)) {
            return "";
        }

        String urlWithoutQuery = jdbcUrl;
        int queryStart = urlWithoutQuery.indexOf('?');
        if (queryStart >= 0) {
            urlWithoutQuery = urlWithoutQuery.substring(0, queryStart);
        }

        int lastSlash = urlWithoutQuery.lastIndexOf('/');
        if (lastSlash < 0 || lastSlash == urlWithoutQuery.length() - 1) {
            return "";
        }

        return urlWithoutQuery.substring(lastSlash + 1).trim();
    }
}
