package com.solereax.inventory.promotion;

import com.solereax.inventory.promotion.dto.PromotionValidationResponse;
import java.math.BigDecimal;
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
        BigDecimal subtotal = null;
        Object subtotalValue = body.get("subtotal");
        if (subtotalValue instanceof Number number) {
            subtotal = new BigDecimal(number.toString());
        } else if (subtotalValue != null) {
            subtotal = new BigDecimal(String.valueOf(subtotalValue));
        }
        return promotionService.validatePromotion(code, subtotal);
    }
}

