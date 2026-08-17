package com.solereax.inventory.inventory;

public enum StockSizeGroup {
    STANDARD,
    MEN,
    WOMEN;

    public static StockSizeGroup forDepartment(String department, String requestedGroup) {
        String normalizedDepartment = department == null ? "" : department.trim().toUpperCase();
        if (!"UNISEX".equals(normalizedDepartment)) {
            return STANDARD;
        }
        return "WOMEN".equalsIgnoreCase(requestedGroup) ? WOMEN : MEN;
    }
}

