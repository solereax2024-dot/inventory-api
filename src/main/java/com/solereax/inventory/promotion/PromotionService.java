package com.solereax.inventory.promotion;

import com.solereax.inventory.promotion.dto.CreatePromotionRequest;
import com.solereax.inventory.promotion.dto.PromotionResponse;
import com.solereax.inventory.promotion.dto.PromotionValidationResponse;
import com.solereax.inventory.promotion.dto.UpdatePromotionRequest;
import com.solereax.inventory.shared.NotFoundException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PromotionService {
    private static final int MONEY_SCALE = 2;

    private final PromotionRepository promotionRepository;

    public PromotionService(PromotionRepository promotionRepository) {
        this.promotionRepository = promotionRepository;
    }

    public record PromotionApplication(PromotionResponse promotion, BigDecimal discountAmount, BigDecimal totalAfterDiscount) {}

    private PromotionResponse toResponse(Promotion promotion) {
        return new PromotionResponse(
                promotion.getId(),
                promotion.getCode(),
                promotion.getName(),
                promotion.getDescription(),
                promotion.getDiscountType().name(),
                promotion.getDiscountValue(),
                promotion.getMinOrderAmount(),
                promotion.getMaxDiscountAmount(),
                promotion.getUsageLimit(),
                promotion.getUsedCount(),
                promotion.getStartsAt(),
                promotion.getEndsAt(),
                promotion.isActive(),
                promotion.getCreatedAt(),
                promotion.getUpdatedAt()
        );
    }

    @Transactional(readOnly = true)
    public List<PromotionResponse> listPromotions() {
        return promotionRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public PromotionResponse createPromotion(CreatePromotionRequest request) {
        Promotion promotion = new Promotion();
        applyCreateRequest(promotion, request);
        return toResponse(promotionRepository.save(promotion));
    }

    @Transactional
    public PromotionResponse updatePromotion(Long id, UpdatePromotionRequest request) {
        Promotion promotion = promotionRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Promotion not found: " + id));
        applyUpdateRequest(promotion, request);
        return toResponse(promotionRepository.save(promotion));
    }

    @Transactional
    public void deletePromotion(Long id) {
        Promotion promotion = promotionRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Promotion not found: " + id));
        promotionRepository.delete(promotion);
    }

    @Transactional(readOnly = true)
    public PromotionValidationResponse validatePromotion(String code, BigDecimal subtotal) {
        PromotionApplication application = resolvePromotion(code, subtotal, false);
        return new PromotionValidationResponse(
                true,
                application.promotion().code(),
                application.promotion().name(),
                application.promotion().description(),
                application.promotion().discountType(),
                application.discountAmount(),
                application.totalAfterDiscount(),
                "Promotion applied successfully."
        );
    }

    @Transactional
    public PromotionApplication applyPromotion(String code, BigDecimal subtotal) {
        return resolvePromotion(code, subtotal, true);
    }

    private PromotionApplication resolvePromotion(String code, BigDecimal subtotal, boolean incrementUsage) {
        String normalizedCode = normalizeCode(code);
        BigDecimal normalizedSubtotal = sanitizeMoney(subtotal, "Subtotal must be 0 or higher.");
        if (normalizedCode == null) {
            throw new IllegalArgumentException("Please enter a promotion code.");
        }

        Promotion promotion = incrementUsage
                ? promotionRepository.findByCodeIgnoreCaseForUpdate(normalizedCode)
                        .orElseThrow(() -> new IllegalArgumentException("Promotion code not found."))
                : promotionRepository.findByCodeIgnoreCase(normalizedCode)
                        .orElseThrow(() -> new IllegalArgumentException("Promotion code not found."));

        validatePromotionWindow(promotion);

        BigDecimal minOrderAmount = sanitizeOptionalMoney(promotion.getMinOrderAmount());
        if (minOrderAmount != null && normalizedSubtotal.compareTo(minOrderAmount) < 0) {
            throw new IllegalArgumentException("This promotion requires a higher minimum order amount.");
        }

        BigDecimal discountAmount = calculateDiscountAmount(promotion, normalizedSubtotal);
        BigDecimal totalAfterDiscount = normalizedSubtotal.subtract(discountAmount)
                .max(BigDecimal.ZERO)
                .setScale(MONEY_SCALE, RoundingMode.HALF_UP);

        if (incrementUsage) {
            promotion.setUsedCount(promotion.getUsedCount() + 1);
            promotionRepository.save(promotion);
        }

        return new PromotionApplication(toResponse(promotion), discountAmount, totalAfterDiscount);
    }

    private void validatePromotionWindow(Promotion promotion) {
        if (!promotion.isActive()) {
            throw new IllegalArgumentException("This promotion is no longer active.");
        }
        Instant now = Instant.now();
        if (promotion.getStartsAt() != null && now.isBefore(promotion.getStartsAt())) {
            throw new IllegalArgumentException("This promotion is not active yet.");
        }
        if (promotion.getEndsAt() != null && now.isAfter(promotion.getEndsAt())) {
            throw new IllegalArgumentException("This promotion has expired.");
        }
        if (promotion.getUsageLimit() != null && promotion.getUsedCount() >= promotion.getUsageLimit()) {
            throw new IllegalArgumentException("This promotion has reached its usage limit.");
        }
    }

    private BigDecimal calculateDiscountAmount(Promotion promotion, BigDecimal subtotal) {
        BigDecimal discountValue = sanitizeMoney(promotion.getDiscountValue(), "Promotion discount value must be 0 or higher.");
        BigDecimal discountAmount;
        if (promotion.getDiscountType() == PromotionDiscountType.PERCENT) {
            if (discountValue.compareTo(BigDecimal.valueOf(100)) > 0) {
                throw new IllegalArgumentException("Percent discounts cannot exceed 100%.");
            }
            discountAmount = subtotal.multiply(discountValue).divide(BigDecimal.valueOf(100), MONEY_SCALE, RoundingMode.HALF_UP);
        } else {
            discountAmount = discountValue;
        }

        BigDecimal maxDiscountAmount = sanitizeOptionalMoney(promotion.getMaxDiscountAmount());
        if (maxDiscountAmount != null) {
            discountAmount = discountAmount.min(maxDiscountAmount);
        }
        return discountAmount.min(subtotal).setScale(MONEY_SCALE, RoundingMode.HALF_UP);
    }

    private void applyCreateRequest(Promotion promotion, CreatePromotionRequest request) {
        String code = normalizeCode(request.code());
        if (code == null) {
            throw new IllegalArgumentException("Promotion code cannot be empty.");
        }
        if (promotionRepository.findByCodeIgnoreCase(code).isPresent()) {
            throw new IllegalArgumentException("Promotion already exists: " + code);
        }

        String name = trimToNull(request.name());
        if (name == null) {
            throw new IllegalArgumentException("Promotion name cannot be empty.");
        }

        String discountTypeValue = trimToNull(request.discountType());
        if (discountTypeValue == null) {
            throw new IllegalArgumentException("Invalid promotion discount type.");
        }

        PromotionDiscountType discountType;
        try {
            discountType = PromotionDiscountType.valueOf(discountTypeValue.toUpperCase(Locale.ROOT));
        } catch (Exception ex) {
            throw new IllegalArgumentException("Invalid promotion discount type.");
        }

        BigDecimal discountValue = sanitizeMoney(request.discountValue(), "Promotion discount value must be 0 or higher.");
        if (discountType == PromotionDiscountType.PERCENT && discountValue.compareTo(BigDecimal.valueOf(100)) > 0) {
            throw new IllegalArgumentException("Percent discounts cannot exceed 100%.");
        }

        BigDecimal minOrderAmount = sanitizeOptionalMoney(request.minOrderAmount());
        BigDecimal maxDiscountAmount = sanitizeOptionalMoney(request.maxDiscountAmount());
        if (request.usageLimit() != null && request.usageLimit() <= 0) {
            throw new IllegalArgumentException("Usage limit must be greater than 0.");
        }
        if (request.startsAt() != null && request.endsAt() != null && request.endsAt().isBefore(request.startsAt())) {
            throw new IllegalArgumentException("Promotion end date must be after the start date.");
        }

        promotion.setCode(code);
        promotion.setName(name);
        promotion.setDescription(trimToNull(request.description()));
        promotion.setDiscountType(discountType);
        promotion.setDiscountValue(discountValue);
        promotion.setMinOrderAmount(minOrderAmount);
        promotion.setMaxDiscountAmount(maxDiscountAmount);
        promotion.setUsageLimit(request.usageLimit());
        promotion.setStartsAt(request.startsAt());
        promotion.setEndsAt(request.endsAt());
        promotion.setActive(request.active() == null || request.active());
    }

    private void applyUpdateRequest(Promotion promotion, UpdatePromotionRequest request) {
        PromotionDiscountType effectiveDiscountType = promotion.getDiscountType();
        BigDecimal effectiveDiscountValue = promotion.getDiscountValue();

        if (request.code() != null) {
            String code = normalizeCode(request.code());
            if (code == null) {
                throw new IllegalArgumentException("Promotion code cannot be empty.");
            }
            promotionRepository.findByCodeIgnoreCase(code)
                    .filter(existing -> !existing.getId().equals(promotion.getId()))
                    .ifPresent(existing -> {
                        throw new IllegalArgumentException("Promotion already exists: " + code);
                    });
            promotion.setCode(code);
        }

        if (request.name() != null) {
            String name = trimToNull(request.name());
            if (name == null) {
                throw new IllegalArgumentException("Promotion name cannot be empty.");
            }
            promotion.setName(name);
        }

        if (request.description() != null) {
            promotion.setDescription(trimToNull(request.description()));
        }

        if (request.discountType() != null) {
            String discountTypeValue = trimToNull(request.discountType());
            if (discountTypeValue == null) {
              throw new IllegalArgumentException("Invalid promotion discount type.");
            }
            PromotionDiscountType discountType;
            try {
                discountType = PromotionDiscountType.valueOf(discountTypeValue.toUpperCase(Locale.ROOT));
            } catch (Exception ex) {
                throw new IllegalArgumentException("Invalid promotion discount type.");
            }
            effectiveDiscountType = discountType;
        }

        if (request.discountValue() != null) {
            effectiveDiscountValue = sanitizeMoney(request.discountValue(), "Promotion discount value must be 0 or higher.");
        }

        if (request.minOrderAmount() != null) {
            promotion.setMinOrderAmount(sanitizeOptionalMoney(request.minOrderAmount()));
        }

        if (request.maxDiscountAmount() != null) {
            promotion.setMaxDiscountAmount(sanitizeOptionalMoney(request.maxDiscountAmount()));
        }

        if (request.usageLimit() != null) {
            if (request.usageLimit() <= 0) {
                throw new IllegalArgumentException("Usage limit must be greater than 0.");
            }
            promotion.setUsageLimit(request.usageLimit());
        }

        Instant startsAt = request.startsAt() != null ? request.startsAt() : promotion.getStartsAt();
        Instant endsAt = request.endsAt() != null ? request.endsAt() : promotion.getEndsAt();
        if (startsAt != null && endsAt != null && endsAt.isBefore(startsAt)) {
            throw new IllegalArgumentException("Promotion end date must be after the start date.");
        }
        if (request.startsAt() != null) {
            promotion.setStartsAt(request.startsAt());
        }
        if (request.endsAt() != null) {
            promotion.setEndsAt(request.endsAt());
        }

        if (request.active() != null) {
            promotion.setActive(request.active());
        }

        if (effectiveDiscountType == PromotionDiscountType.PERCENT && effectiveDiscountValue.compareTo(BigDecimal.valueOf(100)) > 0) {
            throw new IllegalArgumentException("Percent discounts cannot exceed 100%.");
        }

        promotion.setDiscountType(effectiveDiscountType);
        promotion.setDiscountValue(effectiveDiscountValue);
    }

    private String normalizeCode(String value) {
        String trimmed = trimToNull(value);
        return trimmed == null ? null : trimmed.toUpperCase(Locale.ROOT);
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private BigDecimal sanitizeMoney(BigDecimal value, String errorMessage) {
        if (value == null) {
            throw new IllegalArgumentException(errorMessage);
        }
        if (value.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException(errorMessage);
        }
        return value.setScale(MONEY_SCALE, RoundingMode.HALF_UP);
    }

    private BigDecimal sanitizeOptionalMoney(BigDecimal value) {
        if (value == null) {
            return null;
        }
        if (value.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Money values must be 0 or higher.");
        }
        return value.setScale(MONEY_SCALE, RoundingMode.HALF_UP);
    }
}
