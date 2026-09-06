package com.solereax.inventory.promotion;

import com.solereax.inventory.promotion.dto.CreatePromotionRequest;
import com.solereax.inventory.promotion.dto.PromotionResponse;
import com.solereax.inventory.promotion.dto.UpdatePromotionRequest;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/promotions")
public class AdminPromotionController {
    private final PromotionService promotionService;

    public AdminPromotionController(PromotionService promotionService) {
        this.promotionService = promotionService;
    }

    @GetMapping
    public List<PromotionResponse> listPromotions() {
        return promotionService.listPromotions();
    }

    @PostMapping
    public PromotionResponse createPromotion(@Valid @RequestBody CreatePromotionRequest request) {
        return promotionService.createPromotion(request);
    }

    @PatchMapping("/{promotionId}")
    public PromotionResponse updatePromotion(
            @PathVariable Long promotionId,
            @Valid @RequestBody UpdatePromotionRequest request
    ) {
        return promotionService.updatePromotion(promotionId, request);
    }

    @DeleteMapping("/{promotionId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deletePromotion(@PathVariable Long promotionId) {
        promotionService.deletePromotion(promotionId);
    }
}

