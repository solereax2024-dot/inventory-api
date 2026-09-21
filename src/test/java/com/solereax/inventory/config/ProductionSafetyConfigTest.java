package com.solereax.inventory.config;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import org.junit.jupiter.api.Test;

class ProductionSafetyConfigTest {

    @Test
    void allowsNonProductionStartupWithoutExplicitDbUrl() {
        assertDoesNotThrow(() -> ProductionSafetyConfig.validateProductionDatabaseConfiguration(
                false,
                "jdbc:postgresql://localhost:5432/inventory",
                null,
                List.of("inventory")
        ));
    }

    @Test
    void rejectsProductionStartupWithoutExplicitDbUrl() {
        IllegalStateException exception = assertThrows(
                IllegalStateException.class,
                () -> ProductionSafetyConfig.validateProductionDatabaseConfiguration(
                        true,
                        "jdbc:postgresql://localhost:5432/inventory",
                        null,
                        List.of("inventory")
                )
        );

        assertTrue(exception.getMessage().contains("DB_URL"));
    }

    @Test
    void rejectsProductionStartupWhenDatabaseNameIsNotAllowed() {
        IllegalStateException exception = assertThrows(
                IllegalStateException.class,
                () -> ProductionSafetyConfig.validateProductionDatabaseConfiguration(
                        true,
                        "jdbc:postgresql://localhost:5432/sole_reax",
                        "jdbc:postgresql://localhost:5432/sole_reax",
                        List.of("inventory")
                )
        );

        assertTrue(exception.getMessage().contains("sole_reax"));
    }

    @Test
    void allowsProductionStartupForApprovedDatabase() {
        assertDoesNotThrow(() -> ProductionSafetyConfig.validateProductionDatabaseConfiguration(
                true,
                "jdbc:postgresql://localhost:5432/inventory",
                "jdbc:postgresql://localhost:5432/inventory",
                List.of("inventory")
        ));
    }

    @Test
    void extractsDatabaseNameWithoutQueryParameters() {
        assertEquals(
                "inventory",
                ProductionSafetyConfig.extractDatabaseName(
                        "jdbc:postgresql://db.example.com:25060/inventory?sslmode=require"
                )
        );
    }
}
