package com.solereax.inventory.pricing;

import java.math.BigDecimal;
import java.math.RoundingMode;

public final class PricingPolicy {
    public static final BigDecimal CUSTOMER_MARKUP = new BigDecimal("2000.00");

    private PricingPolicy() {
    }

    public static BigDecimal toCustomerPrice(BigDecimal supplierPrice) {
        return toCustomerPrice(supplierPrice, null);
    }

    public static BigDecimal toCustomerPrice(BigDecimal supplierPrice, BigDecimal overrideMarkup) {
        if (supplierPrice == null) {
            return null;
        }
        BigDecimal markup = overrideMarkup == null ? CUSTOMER_MARKUP : overrideMarkup;
        return supplierPrice.add(markup).setScale(2, RoundingMode.HALF_UP);
    }
}

