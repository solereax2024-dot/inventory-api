package com.solereax.inventory.inventory;

import java.util.List;
import java.util.Locale;

public final class ColorwayStandard {
    public static final List<String> DEFAULT_COLORWAYS = List.of(
            "TRIPLE BLACK",
            "BLACK/WHITE",
            "WHITE/GUM",
            "RED/WHITE"
    );

    private ColorwayStandard() {
    }

    public static String normalizeAndValidate(String rawValue) {
        String normalized = rawValue == null ? "" : rawValue.trim().toUpperCase(Locale.ROOT);
        if (normalized.isBlank()) {
            throw new IllegalArgumentException("Colorway is required.");
        }
        if (normalized.length() > 80) {
            throw new IllegalArgumentException("Colorway is too long.");
        }
        return normalized;
    }
}
