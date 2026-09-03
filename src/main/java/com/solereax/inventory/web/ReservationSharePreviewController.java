package com.solereax.inventory.web;

import com.solereax.inventory.inventory.ColorwayStandard;
import com.solereax.inventory.inventory.Product;
import com.solereax.inventory.inventory.ProductColorwayImage;
import com.solereax.inventory.inventory.ProductRepository;
import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ReservationSharePreviewController {
    private static final String DEFAULT_SHARE_DESCRIPTION = "Reserve authentic sneakers from top brands with updated colorways and size availability.";
    private static final String DEFAULT_PREVIEW_IMAGE = "/logo.png";

    private final ProductRepository productRepository;

    public ReservationSharePreviewController(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    @GetMapping(value = {"/reserve/{productId}", "/reserve/{productId}/"}, produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> reservationPage(
            @PathVariable Long productId,
            @RequestParam(value = "colorway", required = false) String colorway,
            HttpServletRequest request
    ) throws IOException {
        String html = readSpaIndex();

        Optional<Product> productOpt = productRepository.findActiveByIdWithColorwayImages(productId);
        if (productOpt.isEmpty()) {
            productOpt = productRepository.findById(productId).filter(Product::isActive);
        }
        if (productOpt.isEmpty()) {
            return ResponseEntity.ok().contentType(MediaType.TEXT_HTML).body(html);
        }

        Product product = productOpt.get();
        String selectedColorway = normalizeColorway(colorway);
        String title = buildTitle(product);
        String description = buildDescription(product);
        String canonicalUrl = buildCanonicalUrl(request);
        String imageUrl = toAbsoluteUrl(request, resolveImageUrl(product, selectedColorway));

        String updated = html;
        updated = replaceTag(updated, "<title>Sole Reax PH | Official Site</title>", "<title>" + escapeHtml(title) + "</title>");
        updated = replaceMetaContent(updated, "name", "description", description);
        updated = replaceLinkHref(updated, "canonical", canonicalUrl);

        updated = replaceMetaContent(updated, "property", "og:title", title);
        updated = replaceMetaContent(updated, "property", "og:description", description);
        updated = replaceMetaContent(updated, "property", "og:url", canonicalUrl);
        updated = replaceMetaContent(updated, "property", "og:image", imageUrl);

        updated = replaceMetaContent(updated, "name", "twitter:title", title);
        updated = replaceMetaContent(updated, "name", "twitter:description", description);
        updated = replaceMetaContent(updated, "name", "twitter:image", imageUrl);

        updated = replaceOrganizationJsonLd(updated, canonicalUrl, imageUrl);

        return ResponseEntity.ok().contentType(MediaType.TEXT_HTML).body(updated);
    }

    private String readSpaIndex() throws IOException {
        ClassPathResource resource = new ClassPathResource("static/index.html");
        try (InputStream in = resource.getInputStream()) {
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    private String buildTitle(Product product) {
        String name = safe(product.getName());
        String brand = safe(product.getBrand());
        if (!brand.isBlank()) {
            return name + " - " + brand + " | Sole Reax PH";
        }
        return name + " | Sole Reax PH";
    }

    private String buildDescription(Product product) {
        String description = safe(product.getDescription());
        if (!description.isBlank()) {
            return description;
        }
        String brand = safe(product.getBrand());
        String name = safe(product.getName());
        if (!brand.isBlank()) {
            return "Reserve " + name + " by " + brand + " on Sole Reax PH.";
        }
        return DEFAULT_SHARE_DESCRIPTION;
    }

    private String resolveImageUrl(Product product, String selectedColorway) {
        if (selectedColorway != null) {
            for (ProductColorwayImage entry : product.getColorwayImages()) {
                String normalized = normalizeColorway(entry.getColorway());
                if (selectedColorway.equals(normalized)) {
                    return entry.getImageUrl();
                }
            }
        }

        String defaultColorway = "DEFAULT";
        for (ProductColorwayImage entry : product.getColorwayImages()) {
            if (defaultColorway.equals(normalizeColorway(entry.getColorway()))) {
                return entry.getImageUrl();
            }
        }

        String productImage = safe(product.getImageUrl());
        if (!productImage.isBlank() && !productImage.contains("via.placeholder")) {
            return productImage;
        }

        return DEFAULT_PREVIEW_IMAGE;
    }

    private String buildCanonicalUrl(HttpServletRequest request) {
        StringBuilder url = new StringBuilder(baseUrl(request));
        url.append(request.getRequestURI());
        if (request.getQueryString() != null && !request.getQueryString().isBlank()) {
            url.append("?").append(request.getQueryString());
        }
        return url.toString();
    }

    private String baseUrl(HttpServletRequest request) {
        String scheme = safe(request.getHeader("X-Forwarded-Proto"));
        if (scheme.isBlank()) {
            scheme = request.getScheme();
        }
        if ("http".equalsIgnoreCase(scheme)) {
            scheme = "https";
        }
        String host = request.getServerName();
        int port = request.getServerPort();

        boolean defaultPort = ("http".equalsIgnoreCase(scheme) && port == 80)
                || ("https".equalsIgnoreCase(scheme) && port == 443);

        if (defaultPort) {
            return scheme + "://" + host;
        }
        return scheme + "://" + host + ":" + port;
    }

    private String toAbsoluteUrl(HttpServletRequest request, String value) {
        if (value == null || value.isBlank()) {
            return baseUrl(request) + DEFAULT_PREVIEW_IMAGE;
        }
        if (value.startsWith("http://") || value.startsWith("https://")) {
            return value;
        }
        String normalized = value.startsWith("/") ? value : "/" + value;
        return baseUrl(request) + normalized;
    }

    private String normalizeColorway(String raw) {
        if (raw == null || raw.trim().isEmpty()) {
            return null;
        }
        if ("DEFAULT".equalsIgnoreCase(raw)) {
            return "DEFAULT";
        }
        try {
            return ColorwayStandard.normalizeAndValidate(raw);
        } catch (IllegalArgumentException ignored) {
            return raw.trim().toUpperCase(Locale.ROOT);
        }
    }

    private String replaceMetaContent(String html, String attr, String attrValue, String content) {
        String regex = "(<meta\\s+[^>]*" + Pattern.quote(attr) + "=\\\"" + Pattern.quote(attrValue)
                + "\\\"[^>]*content=\\\")([^\\\"]*)(\\\"[^>]*>)";
        Matcher matcher = Pattern.compile(regex).matcher(html);
        if (!matcher.find()) {
            return html;
        }
        String replacement = matcher.group(1) + escapeHtml(content) + matcher.group(3);
        return matcher.replaceFirst(Matcher.quoteReplacement(replacement));
    }

    private String replaceLinkHref(String html, String relValue, String href) {
        String regex = "(<link\\s+[^>]*rel=\\\"" + Pattern.quote(relValue) + "\\\"[^>]*href=\\\")([^\\\"]*)(\\\"[^>]*>)";
        Matcher matcher = Pattern.compile(regex).matcher(html);
        if (!matcher.find()) {
            return html;
        }
        String replacement = matcher.group(1) + escapeHtml(href) + matcher.group(3);
        return matcher.replaceFirst(Matcher.quoteReplacement(replacement));
    }

    private String replaceOrganizationJsonLd(String html, String url, String logo) {
        String replacement = """
                <script type=\"application/ld+json\">
                  {
                    \"@context\": \"https://schema.org\",
                    \"@type\": \"Organization\",
                    \"name\": \"Sole Reax Official\",
                    \"url\": \"%s\",
                    \"logo\": \"%s\"
                  }
                </script>
                """.formatted(escapeJson(url), escapeJson(logo));

        String regex = "(?s)<script type=\\\"application/ld\\+json\\\">.*?</script>";
        return html.replaceFirst(regex, Matcher.quoteReplacement(replacement.trim()));
    }

    private String replaceTag(String html, String original, String replacement) {
        return html.contains(original) ? html.replace(original, replacement) : html;
    }

    private String safe(String value) {
        return value == null ? "" : value.trim();
    }

    private String escapeHtml(String value) {
        return safe(value)
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }

    private String escapeJson(String value) {
        return safe(value).replace("\\", "\\\\").replace("\"", "\\\"");
    }
}

