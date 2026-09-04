package com.solereax.inventory.web;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.solereax.inventory.brand.Brand;
import com.solereax.inventory.brand.BrandRepository;
import com.solereax.inventory.inventory.Product;
import com.solereax.inventory.inventory.ProductColorwayImage;
import com.solereax.inventory.inventory.ProductRepository;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.test.util.ReflectionTestUtils;

class SharePreviewBaseUrlTest {

    @Test
    void reservationBaseUrl_usesHttpsWithoutPort80_whenBehindProxy() {
        ReservationSharePreviewController controller = new ReservationSharePreviewController(mock(ProductRepository.class));
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setScheme("http");
        request.setServerName("solereax.com");
        request.setServerPort(80);
        request.addHeader("X-Forwarded-Proto", "https");

        String baseUrl = ReflectionTestUtils.invokeMethod(controller, "baseUrl", request);

        assertEquals("https://solereax.com", baseUrl);
    }

    @Test
    void collectionBaseUrl_prefersForwardedHostAndPort() {
        CollectionSharePreviewController controller = new CollectionSharePreviewController(
                mock(BrandRepository.class),
                mock(ProductRepository.class)
        );
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setScheme("http");
        request.setServerName("internal-host");
        request.setServerPort(8080);
        request.addHeader("X-Forwarded-Proto", "https");
        request.addHeader("X-Forwarded-Host", "solereax.com");
        request.addHeader("X-Forwarded-Port", "8443");

        String baseUrl = ReflectionTestUtils.invokeMethod(controller, "baseUrl", request);

        assertEquals("https://solereax.com:8443", baseUrl);
    }

    @Test
    void collectionPage_brandQuery_usesBrandLogoAndCanonicalUrl() throws IOException {
        BrandRepository brandRepository = mock(BrandRepository.class);
        ProductRepository productRepository = mock(ProductRepository.class);
        CollectionSharePreviewController controller = new CollectionSharePreviewController(brandRepository, productRepository);
        Brand brand = new Brand();
        brand.setName("Nike");
        brand.setLogoUrl("https://cdn.solereax.com/brands/nike.png");
        when(brandRepository.findByNameIgnoreCase("Nike")).thenReturn(Optional.of(brand));

        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/brands");
        request.setScheme("https");
        request.setServerName("solereax.com");
        request.setServerPort(443);
        request.setQueryString("brand=Nike");
        request.addParameter("brand", "Nike");

        ResponseEntity<String> response = controller.collectionPage("Nike", null, request);
        String body = response.getBody();
        assertNotNull(body);

        assertTrue(body.contains("<title>Nike Brand | Sole Reax PH</title>"));
        assertTrue(body.contains("<link rel=\"canonical\" href=\"https://solereax.com/brands?brand=Nike\" />"));
        assertTrue(body.contains("property=\"og:url\" content=\"https://solereax.com/brands?brand=Nike\""));
        assertTrue(body.contains("property=\"og:image\" content=\"https://cdn.solereax.com/brands/nike.png\""));
    }

    @Test
    void collectionPage_brandPath_infersBrandAndBuildsAbsoluteLogoUrl() throws IOException {
        BrandRepository brandRepository = mock(BrandRepository.class);
        ProductRepository productRepository = mock(ProductRepository.class);
        CollectionSharePreviewController controller = new CollectionSharePreviewController(brandRepository, productRepository);
        Brand brand = new Brand();
        brand.setName("New Balance");
        brand.setLogoUrl("/uploads/brands/new-balance.png");
        when(brandRepository.findByNameIgnoreCase("New Balance")).thenReturn(Optional.of(brand));
        when(productRepository.findAllActiveWithStocks()).thenReturn(List.of());

        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/brands/New%20Balance");
        request.setScheme("http");
        request.setServerName("solereax.com");
        request.setServerPort(80);
        request.addHeader("X-Forwarded-Proto", "https");

        ResponseEntity<String> response = controller.collectionPage(null, null, request);
        String body = response.getBody();
        assertNotNull(body);

        assertTrue(body.contains("<title>New Balance Brand | Sole Reax PH</title>"));
        assertTrue(body.contains("property=\"og:url\" content=\"https://solereax.com/brands/New%20Balance\""));
        assertTrue(body.contains("property=\"og:image\" content=\"https://solereax.com/uploads/brands/new-balance.png\""));
    }

    @Test
    void reservationPage_usesAbsolutePreviewImageAndCanonicalUrl_whenBehindProxy() throws IOException {
        ProductRepository productRepository = mock(ProductRepository.class);
        ReservationSharePreviewController controller = new ReservationSharePreviewController(productRepository);

        Product product = new Product();
        product.setId(123L);
        product.setName("Air Max 1");
        product.setBrand("Nike");
        product.setDescription("Classic Nike runner.");
        product.setActive(true);

        ProductColorwayImage colorwayImage = new ProductColorwayImage();
        colorwayImage.setProduct(product);
        colorwayImage.setColorway("BLACK/WHITE");
        colorwayImage.setImageUrl("/uploads/products/air-max-1-black-white.webp");
        product.getColorwayImages().add(colorwayImage);

        when(productRepository.findActiveByIdWithColorwayImages(123L)).thenReturn(Optional.of(product));

        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/reserve/123");
        request.setScheme("http");
        request.setServerName("solereax.com");
        request.setServerPort(80);
        request.setQueryString("colorway=BLACK/WHITE");
        request.addParameter("colorway", "BLACK/WHITE");
        request.addHeader("X-Forwarded-Proto", "https");

        ResponseEntity<String> response = controller.reservationPage(123L, "BLACK/WHITE", request);
        String body = response.getBody();
        assertNotNull(body);

        assertTrue(body.contains("<title>Air Max 1 - Nike | Sole Reax PH</title>"));
        assertTrue(body.contains("property=\"og:url\" content=\"https://solereax.com/reserve/123?colorway=BLACK/WHITE\""));
        assertTrue(body.contains("property=\"og:image\" content=\"https://solereax.com/uploads/products/air-max-1-black-white.webp\""));
        assertTrue(body.contains("name=\"twitter:image\" content=\"https://solereax.com/uploads/products/air-max-1-black-white.webp\""));
    }

    @Test
    void staticIndex_containsDefaultSharePreviewImageForBaseUrl() throws IOException {
        String html;
        try (var inputStream = new ClassPathResource("static/index.html").getInputStream()) {
            html = new String(inputStream.readAllBytes(), StandardCharsets.UTF_8);
        }

        assertTrue(html.contains("<link rel=\"canonical\" href=\"https://solereax.com/\" />"));
        assertTrue(html.contains("<meta property=\"og:image\" content=\"https://solereax.com/logo.png\" />"));
        assertTrue(html.contains("<meta name=\"twitter:image\" content=\"https://solereax.com/logo.png\" />"));
    }
}

