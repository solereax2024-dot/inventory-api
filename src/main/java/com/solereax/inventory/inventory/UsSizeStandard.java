package com.solereax.inventory.inventory;

import java.util.Comparator;
import java.util.List;
import java.util.Locale;

public final class UsSizeStandard {
    public static final List<String> US_SIZES = List.of(
            "1", "1.5", "2", "2.5", "3", "3.5", "4", "4.5", "5", "5.5", "6", "6.5", "7", "7.5", "8", "8.5", "9", "9.5", "10", "10.5", "11", "11.5", "12", "12.5", "13", "13.5", "14", "14.5", "15", "15.5", "16", "16.5", "17", "17.5", "18", "18.5", "19", "19.5", "20", "20.5", "21", "21.5", "22"
    );

    private static final double MIN_US_SIZE = 1.0;
    private static final double MAX_US_SIZE = 22.0;

    private UsSizeStandard() {
    }

    public static String normalizeAndValidate(String rawValue) {
        String normalized = rawValue == null ? "" : rawValue.trim().toUpperCase(Locale.ROOT);
        if (normalized.startsWith("US ")) {
            normalized = normalized.substring(3).trim();
        }
        double value;
        try {
            value = Double.parseDouble(normalized);
        } catch (NumberFormatException ex) {
            throw new IllegalArgumentException("Size must be US-based. Allowed sizes: " + String.join(", ", US_SIZES));
        }

        double doubled = value * 2.0;
        boolean isHalfStep = Math.abs(doubled - Math.rint(doubled)) < 1e-9;
        if (!isHalfStep || value < MIN_US_SIZE || value > MAX_US_SIZE) {
            throw new IllegalArgumentException("Size must be US-based. Allowed sizes: " + String.join(", ", US_SIZES));
        }

        long scaled = Math.round(doubled);
        return (scaled % 2 == 0) ? String.valueOf(scaled / 2) : (scaled / 2) + ".5";
    }

    public static Comparator<ProductStock> stockComparator() {
        return Comparator.comparing(ProductStock::getColorway)
                .thenComparingDouble((ProductStock stock) -> parseSizeForSort(stock.getSizeLabel()))
                .thenComparing(ProductStock::getSizeLabel);
    }

    private static double parseSizeForSort(String value) {
        try {
            return Double.parseDouble(value);
        } catch (NumberFormatException ex) {
            return Double.MAX_VALUE;
        }
    }
}
