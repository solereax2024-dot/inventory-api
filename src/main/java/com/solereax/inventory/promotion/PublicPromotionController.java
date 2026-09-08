package com.solereax.inventory.promotion;

import com.solereax.inventory.promotion.dto.PromotionValidationResponse;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/public/promotions")
public class PublicPromotionController {
    private final PromotionService promotionService;

    public PublicPromotionController(PromotionService promotionService) {
        this.promotionService = promotionService;
    }

    @PostMapping("/validate")
    public PromotionValidationResponse validatePromotion(@RequestBody Map<String, Object> body) {
        String code = body.get("code") == null ? null : String.valueOf(body.get("code"));
        BigDecimal subtotal = parseSubtotal(body.get("subtotal"));
        List<PromotionTargetingSupport.PromotionLineItem> lineItems = parseLineItems(body.get("items"));
        return promotionService.validatePromotion(code, subtotal, lineItems);
    }

    @PostMapping("/auto-sale")
    public PromotionValidationResponse resolveAutoSalePromotion(@RequestBody Map<String, Object> body) {
        BigDecimal subtotal = parseSubtotal(body.get("subtotal"));
        List<PromotionTargetingSupport.PromotionLineItem> lineItems = parseLineItems(body.get("items"));
        return promotionService.resolveAutoSalePromotion(subtotal, lineItems);
    }

    private BigDecimal parseSubtotal(Object subtotalValue) {
        BigDecimal subtotal = null;
        if (subtotalValue instanceof Number number) {
            subtotal = new BigDecimal(number.toString());
        } else if (subtotalValue != null) {
            subtotal = new BigDecimal(String.valueOf(subtotalValue));
        }
        return subtotal;
    }

    private List<PromotionTargetingSupport.PromotionLineItem> parseLineItems(Object itemsValue) {
        List<PromotionTargetingSupport.PromotionLineItem> lineItems = new ArrayList<>();
        if (itemsValue instanceof List<?> itemsList) {
            for (Object rawItem : itemsList) {
                if (!(rawItem instanceof Map<?, ?> itemMap)) {
                    continue;
                }
                Long productId = parseLong(itemMap.get("productId"));
                int quantity = parseInt(itemMap.get("quantity"), 0);
                String brand = itemMap.get("brand") == null ? null : String.valueOf(itemMap.get("brand"));
                String category = itemMap.get("category") == null ? null : String.valueOf(itemMap.get("category"));
                String productType = itemMap.get("productType") == null ? null : String.valueOf(itemMap.get("productType"));
                boolean lowStock = parseBoolean(itemMap.get("lowStock"));
                lineItems.add(new PromotionTargetingSupport.PromotionLineItem(
                        productId,
                        brand,
                        category,
                        productType,
                        lowStock,
                        quantity
                ));
            }
        }
        return lineItems;
    }

    private Long parseLong(Object value) {
        if (value instanceof Number number) {
            return number.longValue();
        }
        if (value == null) {
            return null;
        }
        try {
            return Long.parseLong(String.valueOf(value));
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private int parseInt(Object value, int fallback) {
        if (value instanceof Number number) {
            return number.intValue();
        }
        if (value == null) {
            return fallback;
        }
        try {
            return Integer.parseInt(String.valueOf(value));
        } catch (NumberFormatException ex) {
            return fallback;
        }
    }

    private boolean parseBoolean(Object value) {
        if (value instanceof Boolean bool) {
            return bool;
        }
        return value != null && Boolean.parseBoolean(String.valueOf(value));
    }
}

