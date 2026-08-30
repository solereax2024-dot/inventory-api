package com.solereax.inventory.inventory;

import com.solereax.inventory.inventory.dto.PublicViewStatsResponse;
import com.solereax.inventory.inventory.dto.ViewedProductStatResponse;
import java.util.List;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PublicViewAnalyticsService {
    private static final int TOP_VIEWED_LIMIT = 8;
    private static final String DEFAULT_COLORWAY_KEY = "DEFAULT";

    private final SiteViewSessionRepository siteViewSessionRepository;
    private final ProductViewSessionRepository productViewSessionRepository;
    private final ProductRepository productRepository;

    public PublicViewAnalyticsService(
            SiteViewSessionRepository siteViewSessionRepository,
            ProductViewSessionRepository productViewSessionRepository,
            ProductRepository productRepository
    ) {
        this.siteViewSessionRepository = siteViewSessionRepository;
        this.productViewSessionRepository = productViewSessionRepository;
        this.productRepository = productRepository;
    }

    @Transactional
    public void trackUniqueView(String sessionIdInput, Long productId, String colorwayKeyInput) {
        String sessionId = normalizeSessionId(sessionIdInput);
        if (sessionId == null) {
            return;
        }

        if (!siteViewSessionRepository.existsBySessionId(sessionId)) {
            SiteViewSession siteView = new SiteViewSession();
            siteView.setSessionId(sessionId);
            siteViewSessionRepository.save(siteView);
        }

        if (productId == null || productId <= 0) {
            return;
        }
        String colorwayKey = normalizeColorwayKey(colorwayKeyInput);
        if (productViewSessionRepository.existsByProductIdAndSessionIdAndColorwayKey(productId, sessionId, colorwayKey)) {
            return;
        }

        Product product = productRepository.findManagedById(productId).orElse(null);
        if (product == null) {
            return;
        }

        ProductViewSession productView = new ProductViewSession();
        productView.setProduct(product);
        productView.setSessionId(sessionId);
        productView.setColorwayKey(colorwayKey);
        productViewSessionRepository.save(productView);
    }

    @Transactional(readOnly = true)
    public PublicViewStatsResponse getPublicStats() {
        List<ViewedProductStatResponse> topViewedProducts = productViewSessionRepository
                .findTopViewedProducts(PageRequest.of(0, TOP_VIEWED_LIMIT))
                .stream()
                .map(row -> new ViewedProductStatResponse(
                        row.getProductId(),
                        row.getColorwayKey(),
                        row.getName(),
                        row.getBrand(),
                        row.getViewCount() == null ? 0L : row.getViewCount()
                ))
                .toList();

        return new PublicViewStatsResponse(siteViewSessionRepository.count(), topViewedProducts);
    }

    private String normalizeSessionId(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        if (trimmed.isEmpty()) {
            return null;
        }
        return trimmed.length() > 120 ? trimmed.substring(0, 120) : trimmed;
    }

    private String normalizeColorwayKey(String value) {
        if (value == null) {
            return DEFAULT_COLORWAY_KEY;
        }
        String trimmed = value.trim();
        if (trimmed.isEmpty()) {
            return DEFAULT_COLORWAY_KEY;
        }
        String normalized = trimmed.toUpperCase();
        return normalized.length() > 80 ? normalized.substring(0, 80) : normalized;
    }
}

