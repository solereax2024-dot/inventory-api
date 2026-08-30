package com.solereax.inventory.inventory;

import com.solereax.inventory.inventory.dto.PublicViewStatsResponse;
import com.solereax.inventory.inventory.dto.TrackPublicViewRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/public/analytics/views")
public class PublicViewAnalyticsController {
    private final PublicViewAnalyticsService publicViewAnalyticsService;

    public PublicViewAnalyticsController(PublicViewAnalyticsService publicViewAnalyticsService) {
        this.publicViewAnalyticsService = publicViewAnalyticsService;
    }

    @PostMapping("/track")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void trackView(@Valid @RequestBody TrackPublicViewRequest request) {
        publicViewAnalyticsService.trackUniqueView(request.sessionId(), request.productId(), request.colorwayKey());
    }

    @GetMapping
    public PublicViewStatsResponse getPublicViewStats() {
        return publicViewAnalyticsService.getPublicStats();
    }
}

