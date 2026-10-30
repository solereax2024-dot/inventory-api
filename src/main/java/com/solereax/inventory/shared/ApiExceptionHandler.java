package com.solereax.inventory.shared;

import java.time.Instant;
import java.util.Locale;
import java.util.Map;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ApiExceptionHandler {
    private static final String GIVEAWAY_WHEEL_NAME_UNIQUE_INDEX = "idx_giveaway_wheel_entries_full_name_unique_ci";
    private static final String GIVEAWAY_WHEEL_DUPLICATE_NAME_MESSAGE = "This full name is already registered in Giveaway 2.";

    @ExceptionHandler(NotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public Map<String, Object> handleNotFound(NotFoundException ex) {
        return error(HttpStatus.NOT_FOUND.value(), ex.getMessage());
    }

    @ExceptionHandler(BadCredentialsException.class)
    @ResponseStatus(HttpStatus.UNAUTHORIZED)
    public Map<String, Object> handleBadCredentials(BadCredentialsException ex) {
        return error(HttpStatus.UNAUTHORIZED.value(), ex.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Map<String, Object> handleValidation(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(fieldError -> fieldError.getField() + ": " + fieldError.getDefaultMessage())
                .orElse("Invalid request");
        return error(HttpStatus.BAD_REQUEST.value(), message);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Map<String, Object> handleBadRequest(IllegalArgumentException ex) {
        return error(HttpStatus.BAD_REQUEST.value(), ex.getMessage());
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Map<String, Object> handleDataIntegrityViolation(DataIntegrityViolationException ex) {
        return error(HttpStatus.BAD_REQUEST.value(), resolveDataIntegrityMessage(ex));
    }

    private String resolveDataIntegrityMessage(DataIntegrityViolationException ex) {
        String details = String.valueOf(ex.getMessage()).toLowerCase(Locale.ROOT);
        Throwable cause = ex.getCause();
        while (cause != null) {
            details += " " + String.valueOf(cause.getMessage()).toLowerCase(Locale.ROOT);
            cause = cause.getCause();
        }

        if (details.contains(GIVEAWAY_WHEEL_NAME_UNIQUE_INDEX)
                || (details.contains("giveaway_wheel_entries") && details.contains("full_name") && details.contains("duplicate"))) {
            return GIVEAWAY_WHEEL_DUPLICATE_NAME_MESSAGE;
        }
        return "Unable to save due to a data constraint violation.";
    }

    private Map<String, Object> error(int status, String message) {
        return Map.of(
                "timestamp", Instant.now().toString(),
                "status", status,
                "message", message
        );
    }
}
