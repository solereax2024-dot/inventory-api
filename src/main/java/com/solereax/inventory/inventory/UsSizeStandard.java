package com.solereax.inventory.inventory;

import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

public final class UsSizeStandard {
    public static final List<String> US_SIZES = List.of(
            "6", "6.5", "7", "7.5", "8", "8.5", "9", "9.5", "10", "10.5", "11", "11.5", "12", "12.5", "13"
    );

    private static final Map<String, Integer> US_SIZE_INDEX;

    static {
        Map<String, Integer> indexMap = new LinkedHashMap<>();
        for (int i = 0; i < US_SIZES.size(); i++) {
            indexMap.put(US_SIZES.get(i), i);
        }
        US_SIZE_INDEX = Map.copyOf(indexMap);
    }

    private UsSizeStandard() {
    }

    public static String normalizeAndValidate(String rawValue) {
        String normalized = rawValue == null ? "" : rawValue.trim().toUpperCase(Locale.ROOT);
        if (!US_SIZE_INDEX.containsKey(normalized)) {
            throw new IllegalArgumentException("Size must be US-based. Allowed sizes: " + String.join(", ", US_SIZES));
        }
        return normalized;
    }

    public static Comparator<ProductStock> stockComparator() {
        return Comparator.comparing(ProductStock::getColorway)
                .thenComparingInt((ProductStock stock) -> US_SIZE_INDEX.getOrDefault(stock.getSizeLabel(), Integer.MAX_VALUE))
                .thenComparing(ProductStock::getSizeLabel);
    }
}
