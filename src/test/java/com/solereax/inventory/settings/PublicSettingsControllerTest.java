package com.solereax.inventory.settings;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.Map;
import org.junit.jupiter.api.Test;

class PublicSettingsControllerTest {

    @Test
    void brandingResponseIsNotCachedSoLatestLogoIsAlwaysFetched() {
        BrandingService brandingService = mock(BrandingService.class);
        when(brandingService.getLogoUrl()).thenReturn("/uploads/branding/day-logo.png");
        when(brandingService.getLogoDarkUrl()).thenReturn("/uploads/branding/night-logo.png");

        PublicSettingsController controller = new PublicSettingsController(brandingService);

        var response = controller.branding();

        assertEquals(200, response.getStatusCode().value());
        assertEquals(Map.of(
                "logoUrl", "/uploads/branding/day-logo.png",
                "logoDarkUrl", "/uploads/branding/night-logo.png"
        ), response.getBody());
        assertEquals("no-store", response.getHeaders().getCacheControl());
    }
}

