package com.solereax.inventory.promotion;

import com.solereax.inventory.inventory.Product;
import com.solereax.inventory.inventory.ProductStock;
import com.solereax.inventory.order.CustomerOrderItem;
import java.time.Instant;
import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

public final class PromotionTargetingSupport {
    private PromotionTargetingSupport() {
    }

    public enum PromotionType {
        SALE,
        VOUCHER
    }

    public record PromotionLineItem(
            Long productId,
            String brand,
            String category,
            String productType,
            boolean lowStock,
            int quantity
    ) {
    }

    public static PromotionType parseTypeFromDescription(String description) {
        String value = trimToNull(description);
        if (value == null || !value.startsWith("[")) {
            return PromotionType.VOUCHER;
        }
        int closing = value.indexOf(']');
        if (closing <= 1) {
            return PromotionType.VOUCHER;
        }
        String tag = value.substring(1, closing).trim().toUpperCase(Locale.ROOT);
        return "SALE".equals(tag) ? PromotionType.SALE : PromotionType.VOUCHER;
    }

    public static boolean isSalePromotion(Promotion promotion) {
        return parseTypeFromDescription(promotion.getDescription()) == PromotionType.SALE;
    }

    public static boolean isVoucherPromotion(Promotion promotion) {
        return parseTypeFromDescription(promotion.getDescription()) == PromotionType.VOUCHER;
    }

    public static boolean isActiveNow(Promotion promotion, Instant now) {
        if (promotion == null || !promotion.isActive()) {
            return false;
        }
        if (promotion.getStartsAt() != null && now.isBefore(promotion.getStartsAt())) {
            return false;
        }
        if (promotion.getEndsAt() != null && now.isAfter(promotion.getEndsAt())) {
            return false;
        }
        return promotion.getUsageLimit() == null || promotion.getUsedCount() < promotion.getUsageLimit();
    }

    public static boolean isVisibleOnSalePage(Promotion promotion, Instant now) {
        if (promotion == null || !promotion.isActive()) {
            return false;
        }
        if (promotion.getEndsAt() != null && now.isAfter(promotion.getEndsAt())) {
            return false;
        }
        return promotion.getUsageLimit() == null || promotion.getUsedCount() < promotion.getUsageLimit();
    }

    public static Set<String> parseUpperTokenSet(String raw) {
        String value = trimToNull(raw);
        if (value == null) {
            return Collections.emptySet();
        }
        Set<String> result = new LinkedHashSet<>();
        Arrays.stream(value.split(","))
                .map(PromotionTargetingSupport::trimToNull)
                .filter(token -> token != null)
                .map(token -> token.toUpperCase(Locale.ROOT))
                .forEach(result::add);
        return result;
    }

    public static Set<Long> parseLongTokenSet(String raw) {
        String value = trimToNull(raw);
        if (value == null) {
            return Collections.emptySet();
        }
        Set<Long> result = new LinkedHashSet<>();
        Arrays.stream(value.split(","))
                .map(PromotionTargetingSupport::trimToNull)
                .filter(token -> token != null)
                .forEach(token -> {
                    try {
                        long parsed = Long.parseLong(token);
                        if (parsed > 0) {
                            result.add(parsed);
                        }
                    } catch (NumberFormatException ignored) {
                        // Ignore invalid product id token entries.
                    }
                });
        return result;
    }

    public static boolean isLowStockProduct(Product product) {
        if (product == null) {
            return false;
        }
        return product.getStocks().stream().anyMatch(stock -> {
            int qty = stock == null ? 0 : stock.getQuantity();
            return qty > 0 && qty <= 3;
        });
    }

    public static boolean matchesProduct(Promotion promotion, Product product) {
        if (promotion == null || product == null) {
            return false;
        }
        return matchesLineItem(
                promotion,
                new PromotionLineItem(
                        product.getId(),
                        product.getBrand(),
                        product.getCategory(),
                        product.getProductType(),
                        isLowStockProduct(product),
                        1
                )
        );
    }

    public static boolean hasAnyMatchingItem(Promotion promotion, List<PromotionLineItem> lineItems) {
        if (lineItems == null || lineItems.isEmpty()) {
            return false;
        }
        return lineItems.stream().anyMatch(item -> matchesLineItem(promotion, item));
    }

    public static int matchingQuantity(Promotion promotion, List<PromotionLineItem> lineItems) {
        if (lineItems == null || lineItems.isEmpty()) {
            return 0;
        }
        return lineItems.stream()
                .filter(item -> matchesLineItem(promotion, item))
                .mapToInt(item -> Math.max(0, item.quantity()))
                .sum();
    }

    public static List<PromotionLineItem> fromOrderItems(List<CustomerOrderItem> items) {
        if (items == null || items.isEmpty()) {
            return Collections.emptyList();
        }
        return items.stream().map(item -> {
            Product product = item.getProduct();
            return new PromotionLineItem(
                    product == null ? null : product.getId(),
                    product == null ? null : product.getBrand(),
                    product == null ? null : product.getCategory(),
                    product == null ? null : product.getProductType(),
                    isLowStockProduct(product),
                    item.getQuantity()
            );
        }).toList();
    }

    private static boolean matchesLineItem(Promotion promotion, PromotionLineItem lineItem) {
        if (promotion == null || lineItem == null) {
            return false;
        }
        Set<Long> productIds = parseLongTokenSet(promotion.getTargetProductIds());
        Set<String> brands = parseUpperTokenSet(promotion.getTargetBrands());
        Set<String> categories = parseUpperTokenSet(promotion.getTargetCategories());
        Set<String> productTypes = parseUpperTokenSet(promotion.getTargetProductTypes());

        boolean hasScopedTarget = promotion.isLowStockOnly()
                || !productIds.isEmpty()
                || !brands.isEmpty()
                || !categories.isEmpty()
                || !productTypes.isEmpty();

        if (!hasScopedTarget) {
            return true;
        }

        if (promotion.isLowStockOnly() && !lineItem.lowStock()) {
            return false;
        }

        if (!productIds.isEmpty() && (lineItem.productId() == null || !productIds.contains(lineItem.productId()))) {
            return false;
        }

        String brand = trimToNull(lineItem.brand());
        if (!brands.isEmpty() && (brand == null || !brands.contains(brand.toUpperCase(Locale.ROOT)))) {
            return false;
        }

        String category = trimToNull(lineItem.category());
        if (!categories.isEmpty() && (category == null || !categories.contains(category.toUpperCase(Locale.ROOT)))) {
            return false;
        }

        String productType = trimToNull(lineItem.productType());
        return productTypes.isEmpty() || (productType != null && productTypes.contains(productType.toUpperCase(Locale.ROOT)));
    }

    public static String normalizeCsvText(String value, boolean numericOnly) {
        String trimmed = trimToNull(value);
        if (trimmed == null) {
            return null;
        }
        if (numericOnly) {
            Set<Long> tokens = parseLongTokenSet(trimmed);
            return tokens.isEmpty() ? null : tokens.stream().map(String::valueOf).reduce((a, b) -> a + "," + b).orElse(null);
        }
        Set<String> tokens = parseUpperTokenSet(trimmed);
        return tokens.isEmpty() ? null : String.join(",", tokens);
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}

