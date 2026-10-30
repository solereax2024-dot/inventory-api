package com.solereax.inventory.shared;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;

class ApiExceptionHandlerTest {

    private final ApiExceptionHandler handler = new ApiExceptionHandler();

    @Test
    void handleDataIntegrityViolation_returnsFriendlyMessageForGiveawayDuplicateName() {
        DataIntegrityViolationException exception = new DataIntegrityViolationException(
                "duplicate key value violates unique constraint \"idx_giveaway_wheel_entries_full_name_unique_ci\""
        );

        Map<String, Object> response = handler.handleDataIntegrityViolation(exception);

        assertEquals(400, response.get("status"));
        assertEquals("This full name is already registered in Giveaway 2.", response.get("message"));
    }

    @Test
    void handleDataIntegrityViolation_returnsFallbackMessageForOtherConstraints() {
        DataIntegrityViolationException exception = new DataIntegrityViolationException(
                "duplicate key value violates unique constraint \"idx_other_constraint\""
        );

        Map<String, Object> response = handler.handleDataIntegrityViolation(exception);

        assertEquals(400, response.get("status"));
        assertEquals("Unable to save due to a data constraint violation.", response.get("message"));
    }
}

