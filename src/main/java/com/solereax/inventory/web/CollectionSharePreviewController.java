package com.solereax.inventory.web;

import com.solereax.inventory.brand.Brand;
import com.solereax.inventory.brand.BrandRepository;
import com.solereax.inventory.inventory.Product;
import com.solereax.inventory.inventory.ProductColorwayImage;
import com.solereax.inventory.inventory.ProductRepository;
import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.net.URLDecoder;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class CollectionSharePreviewController {
    private static final String DEFAULT_TITLE = "Collections | Sole Reax PH";
    private static final String DEFAULT_DESCRIPTION = "Browse authentic sneaker collections from top brands with updated colorways and size availability.";
    private static final String DEFAULT_PREVIEW_IMAGE = "/logo.png";

    private final BrandRepository brandRepository;
    private final ProductRepository productRepository;

    public CollectionSharePreviewController(BrandRepository brandRepository, ProductRepository productRepository) {
        this.brandRepository = brandRepository;
        this.productRepository = productRepository;
    }

    @GetMapping(value = {
            "/collections", "/collections/", "/collections/**",
            "/collection", "/collection/", "/collection/**",
            "/shop", "/shop/", "/shop/**",
            "/brands", "/brands/", "/brands/**"
    }, produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> collectionPage(
            @RequestParam(value = "brand", required = false) String brand,
            @RequestParam(value = "department", required = false) String department,
            HttpServletRequest request
    ) throws IOException {
        String html = readSpaIndex();
        String effectiveBrand = inferBrand(brand, request.getRequestURI());
        String canonicalUrl = buildCanonicalUrl(request);
        String title = buildTitle(effectiveBrand, department, request.getRequestURI());
        String description = buildDescription(effectiveBrand, department, request.getRequestURI());
        String imageUrl = toAbsoluteUrl(request, resolvePreviewImage(effectiveBrand));

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

    private String buildTitle(String brand, String department, String path) {
        String brandValue = safe(brand);
        String departmentValue = humanize(department);
        boolean brandsPage = path != null && path.startsWith("/brands");

        if (!brandValue.isBlank() && !departmentValue.isBlank()) {
            return brandValue + " " + departmentValue + " Collection | Sole Reax PH";
        }
        if (!brandValue.isBlank()) {
            return brandValue + (brandsPage ? " Brand | Sole Reax PH" : " Collection | Sole Reax PH");
        }
        if (!departmentValue.isBlank()) {
            return departmentValue + " Collections | Sole Reax PH";
        }
        return brandsPage ? "Brands | Sole Reax PH" : DEFAULT_TITLE;
    }

    private String buildDescription(String brand, String department, String path) {
        String brandValue = safe(brand);
        String departmentValue = humanize(department);
        boolean brandsPage = path != null && path.startsWith("/brands");

        if (!brandValue.isBlank() && !departmentValue.isBlank()) {
            return "Browse " + brandValue + " " + departmentValue + " sneaker colorways and reserve your size on Sole Reax PH.";
        }
        if (!brandValue.isBlank()) {
            return "Browse the latest " + brandValue + " sneaker collection with updated colorways and size availability on Sole Reax PH.";
        }
        if (!departmentValue.isBlank()) {
            return "Explore " + departmentValue + " sneaker collections with updated colorways and size availability on Sole Reax PH.";
        }
        return brandsPage
                ? "Explore featured sneaker brands available on Sole Reax PH."
                : DEFAULT_DESCRIPTION;
    }

    private String resolvePreviewImage(String brand) {
        String normalizedBrand = safe(brand);
        if (!normalizedBrand.isBlank()) {
            Optional<Brand> brandOpt = brandRepository.findByNameIgnoreCase(normalizedBrand);
            if (brandOpt.isPresent()) {
                String logoUrl = safe(brandOpt.get().getLogoUrl());
                if (!logoUrl.isBlank()) {
                    return logoUrl;
                }
            }

            List<Product> products = productRepository.findAllActiveWithStocks();
            Optional<Product> brandProduct = products.stream()
                    .filter(product -> normalizedBrand.equalsIgnoreCase(safe(product.getBrand())))
                    .findFirst();
            if (brandProduct.isPresent()) {
                String productImage = resolveProductPreviewImage(brandProduct.get());
                if (!productImage.isBlank()) {
                    return productImage;
                }
            }
        }
        return DEFAULT_PREVIEW_IMAGE;
    }

    private String resolveProductPreviewImage(Product product) {
        for (ProductColorwayImage entry : product.getColorwayImages()) {
            String imageUrl = safe(entry.getImageUrl());
            if (!imageUrl.isBlank()) {
                return imageUrl;
            }
        }
        String productImage = safe(product.getImageUrl());
        if (!productImage.isBlank() && !productImage.contains("via.placeholder")) {
            return productImage;
        }
        return "";
    }

    private String humanize(String raw) {
        String value = safe(raw);
        if (value.isBlank()) {
            return "";
        }
        String normalized = value.replace('_', ' ').toLowerCase(Locale.ROOT);
        String[] parts = normalized.split("\\s+");
        StringBuilder result = new StringBuilder();
        for (String part : parts) {
            if (part.isBlank()) {
                continue;
            }
            if (!result.isEmpty()) {
                result.append(' ');
            }
            result.append(Character.toUpperCase(part.charAt(0))).append(part.substring(1));
        }
        return result.toString();
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
        String scheme = request.getScheme();
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

    private String inferBrand(String brand, String requestUri) {
        String queryBrand = safe(brand);
        if (!queryBrand.isBlank()) {
            return queryBrand;
        }

        String path = safe(requestUri);
        if (path.startsWith("/brands/")) {
            return decodePathBrand(path.substring("/brands/".length()));
        }
        if (path.startsWith("/collections/")) {
            return decodePathBrand(path.substring("/collections/".length()));
        }
        if (path.startsWith("/collection/")) {
            return decodePathBrand(path.substring("/collection/".length()));
        }
        return "";
    }

    private String decodePathBrand(String value) {
        String segment = safe(value);
        if (segment.isBlank()) {
            return "";
        }

        String firstSegment = segment.split("/")[0];
        String decoded = URLDecoder.decode(firstSegment, StandardCharsets.UTF_8);
        return decoded.replace('-', ' ').trim();
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
                <script type="application/ld+json">
                  {
                    "@context": "https://schema.org",
                    "@type": "Organization",
                    "name": "Sole Reax Official",
                    "url": "%s",
                    "logo": "%s"
                  }
                </script>
                """.formatted(escapeJson(url), escapeJson(logo));

        String regex = "(?s)<script type=\"application/ld\\+json\">.*?</script>";
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

