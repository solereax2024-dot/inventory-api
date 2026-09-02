package com.solereax.inventory.inventory;

import com.solereax.inventory.inventory.dto.AdminAdjustStockRequest;
import com.solereax.inventory.inventory.dto.AdminCreateProductRequest;
import com.solereax.inventory.inventory.dto.AdminUpdateColorwayDetailsRequest;
import com.solereax.inventory.inventory.dto.ColorwayDetailsResponse;
import com.solereax.inventory.inventory.dto.PublicProductResponse;
import com.solereax.inventory.inventory.dto.SizeStockResponse;
import com.solereax.inventory.pricing.PricingPolicy;
import com.solereax.inventory.shared.NotFoundException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InventoryService {
    private static final String MANUAL_STOCK_ADJUSTMENT_REASON = "Manual adjustment";

    private final ProductRepository productRepository;
    private final ProductViewSessionRepository productViewSessionRepository;
    private final ProductStockRepository productStockRepository;
    private final StockMovementRepository stockMovementRepository;

    public InventoryService(
            ProductRepository productRepository,
            ProductViewSessionRepository productViewSessionRepository,
            ProductStockRepository productStockRepository,
            StockMovementRepository stockMovementRepository
    ) {
        this.productRepository = productRepository;
        this.productViewSessionRepository = productViewSessionRepository;
        this.productStockRepository = productStockRepository;
        this.stockMovementRepository = stockMovementRepository;
    }

    @Transactional(readOnly = true)
    public List<PublicProductResponse> listPublicProducts() {
        List<Product> products = productRepository.findAllActiveWithStocks();
        Map<Long, Long> viewCountByProductId = mapViewCountByProductId(products);
        return products
                .stream()
                .map(product -> toPublicResponse(product, viewCountByProductId.getOrDefault(product.getId(), 0L)))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<PublicProductResponse> listAdminProducts() {
        List<Product> products = productRepository.findAllWithStocks();
        Map<Long, Long> viewCountByProductId = mapViewCountByProductId(products);
        return products
                .stream()
                .map(product -> toAdminResponse(product, viewCountByProductId.getOrDefault(product.getId(), 0L)))
                .toList();
    }

    @Transactional
    public PublicProductResponse createProduct(AdminCreateProductRequest request) {
        String normalizedName = request.name().trim();
        String normalizedBrand = trimToNull(request.brand());
        Product product = productRepository.findByBrandAndNameIgnoreCase(normalizedBrand, normalizedName)
                .orElseGet(Product::new);
        if (product.getId() == null) {
            applyProductFields(product, request);
        } else {
            mergeProductFields(product, request);
        }
        applyColorwayImages(product, request, true);
        upsertColorwayDetails(
                product,
                product.getMainColor(),
                request.description(),
                request.department(),
                request.category(),
                request.productType(),
                request.price()
        );
        Product saved = productRepository.save(product);
        initializeDefaultStocks(saved);
        return toAdminResponse(saved);
    }

    @Transactional
    public PublicProductResponse updateProduct(Long productId, AdminCreateProductRequest request) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new NotFoundException("Product not found: " + productId));
        applyProductFields(product, request);
        applyColorwayImages(product, request, false);
        Product saved = productRepository.save(product);
        return toAdminResponse(saved);
    }

    @Transactional
    public PublicProductResponse updateProductColorwayImage(Long productId, String colorway, String imageUrl) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new NotFoundException("Product not found: " + productId));
        upsertColorwayImage(product, colorway, imageUrl);
        Product saved = productRepository.save(product);
        return toAdminResponse(saved);
    }

    @Transactional
    public PublicProductResponse updateProductColorwayDetails(Long productId, AdminUpdateColorwayDetailsRequest request) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new NotFoundException("Product not found: " + productId));
        upsertColorwayDetails(
                product,
                request.colorway(),
                request.description(),
                request.department(),
                request.category(),
                request.productType(),
                request.price()
        );
        Product saved = productRepository.save(product);
        return toAdminResponse(saved);
    }

    @Transactional
    public PublicProductResponse deleteProductColorway(Long productId, String colorwayInput) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new NotFoundException("Product not found: " + productId));

        String normalizedColorway = normalizeColorway(colorwayInput);
        boolean hasMatchingData = product.getStocks().stream().anyMatch(stock -> normalizedColorway.equals(stock.getColorway()))
                || product.getColorwayImages().stream().anyMatch(image -> normalizedColorway.equals(image.getColorway()))
                || product.getColorwayDetails().stream().anyMatch(detail -> normalizedColorway.equals(normalizeColorway(detail.getColorway())))
                || normalizedColorway.equals(normalizeColorway(product.getMainColor()));

        if (!hasMatchingData) {
            throw new NotFoundException("Colorway not found: " + normalizedColorway);
        }

        product.getStocks().removeIf(stock -> normalizedColorway.equals(stock.getColorway()));
        product.getColorwayImages().removeIf(image -> normalizedColorway.equals(image.getColorway()));
        product.getColorwayDetails().removeIf(detail -> normalizedColorway.equals(normalizeColorway(detail.getColorway())));

        if (normalizedColorway.equals(normalizeColorway(product.getMainColor()))) {
            product.setMainColor(findReplacementMainColor(product));
            product.setImageUrl(findReplacementImageUrl(product));
        }

        product.setUpdatedAt(Instant.now());
        Product saved = productRepository.save(product);
        return toAdminResponse(saved);
    }

    @Transactional
    public PublicProductResponse adjustStock(Long productId, AdminAdjustStockRequest request, String changedBy) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new NotFoundException("Product not found: " + productId));

        String normalizedSize = UsSizeStandard.normalizeAndValidate(request.size());
        String normalizedColorway = ColorwayStandard.normalizeAndValidate(request.colorway());
        String normalizedSupplier = trimToNull(request.supplier());
        String referenceSupplier = trimToNull(request.referenceSupplier());
        if (request.quantityChange() > 0 && normalizedSupplier == null) {
            throw new IllegalArgumentException("Supplier is required when adding stock.");
        }
        StockSizeGroup sizeGroup = resolveStockSizeGroup(product, normalizedColorway, request.sizeGroup());
        List<ProductStock> matchingStocks = productStockRepository.findAllForUpdate(
                productId,
                normalizedColorway,
                normalizedSize,
                sizeGroup.name()
        );

        if (request.quantityChange() == 0
                && request.price() != null
                && referenceSupplier == null
                && matchingStocks.size() > 1
                && normalizedSupplier == null
                && !Boolean.TRUE.equals(request.clearSupplier())) {
            BigDecimal normalizedPrice = normalizePrice(request.price());
            BigDecimal normalizedMarkup = normalizeMarkup(request.markup());
            for (ProductStock stock : matchingStocks) {
                stock.setPrice(normalizedPrice);
                if (normalizedMarkup != null) {
                    stock.setMarkup(normalizedMarkup);
                }
                stock.setUpdatedAt(Instant.now());
                productStockRepository.save(stock);
            }
            return toAdminResponse(productRepository.findById(productId)
                    .orElseThrow(() -> new NotFoundException("Product not found: " + productId)));
        }

        ProductStock stock = resolveStockForAdjustment(
                product,
                productId,
                normalizedColorway,
                normalizedSize,
                sizeGroup.name(),
                matchingStocks,
                normalizedSupplier,
                referenceSupplier,
                request.quantityChange()
        );

        int newQuantity = stock.getQuantity() + request.quantityChange();
        if (newQuantity < 0) {
            throw new IllegalArgumentException(
                    "Stock cannot go below zero for colorway " + normalizedColorway + " size " + normalizedSize
            );
        }

        stock.setQuantity(newQuantity);
        if (Boolean.TRUE.equals(request.clearPrice())) {
            stock.setPrice(null);
        } else if (request.price() != null) {
            stock.setPrice(normalizePrice(request.price()));
        }
        if (request.markup() != null) {
            stock.setMarkup(normalizeMarkup(request.markup()));
        }
        if (Boolean.TRUE.equals(request.clearSupplier())) {
            stock.setSupplier(null);
        } else if (request.quantityChange() > 0 && normalizedSupplier != null) {
            stock.setSupplier(normalizedSupplier);
        } else if (request.quantityChange() == 0 && normalizedSupplier != null) {
            stock.setSupplier(normalizedSupplier);
        }
        stock.setUpdatedAt(Instant.now());
        ProductStock savedStock = productStockRepository.save(stock);

        if (request.quantityChange() != 0) {
            StockMovement movement = new StockMovement();
            movement.setProductStock(savedStock);
            movement.setQuantityChange(request.quantityChange());
            movement.setReason(MANUAL_STOCK_ADJUSTMENT_REASON);
            movement.setChangedBy(changedBy);
            stockMovementRepository.save(movement);
        }

        return toAdminResponse(productRepository.findById(productId)
                .orElseThrow(() -> new NotFoundException("Product not found: " + productId)));
    }

    @Transactional
    public void deleteProduct(Long productId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new NotFoundException("Product not found: " + productId));
        productStockRepository.deleteByProductId(productId);
        productRepository.delete(product);
    }

    private void applyProductFields(Product product, AdminCreateProductRequest request) {
        product.setName(request.name().trim());
        product.setBrand(trimToNull(request.brand()));
        product.setDescription(trimToNull(request.description()));
        product.setMainColor(trimToNull(request.mainColor()));
        product.setDepartment(trimToNull(request.department()));
        product.setCategory(trimToNull(request.category()));
        product.setProductType(trimToNull(request.productType()));
        product.setPrice(normalizePrice(request.price()));
        String imageUrl = trimToNull(request.imageUrl());
        if (imageUrl != null) {
            product.setImageUrl(imageUrl);
        }
        if (request.active() != null) {
            product.setActive(request.active());
        }
        product.setUpdatedAt(Instant.now());
    }

    private void mergeProductFields(Product product, AdminCreateProductRequest request) {
        product.setName(request.name().trim());
        String brand = trimToNull(request.brand());
        if (brand != null) {
            product.setBrand(brand);
        }
        String description = trimToNull(request.description());
        if (description != null) {
            product.setDescription(description);
        }
        String mainColor = trimToNull(request.mainColor());
        if (mainColor != null) {
            product.setMainColor(mainColor);
        }
        String department = trimToNull(request.department());
        if (department != null) {
            product.setDepartment(department);
        }
        String category = trimToNull(request.category());
        if (category != null) {
            product.setCategory(category);
        }
        String productType = trimToNull(request.productType());
        if (productType != null) {
            product.setProductType(productType);
        }
        if (request.price() != null) {
            product.setPrice(normalizePrice(request.price()));
        }
        String imageUrl = trimToNull(request.imageUrl());
        if (imageUrl != null && product.getImageUrl() == null) {
            product.setImageUrl(imageUrl);
        }
        if (request.active() != null) {
            product.setActive(request.active());
        }
        product.setUpdatedAt(Instant.now());
    }

    private void applyColorwayImages(Product product, AdminCreateProductRequest request, boolean includeLegacyFallback) {
        Map<String, String> requestImages = request.colorwayImages() == null
                ? Collections.emptyMap()
                : request.colorwayImages();
        requestImages.forEach((colorway, imageUrl) -> upsertColorwayImage(product, colorway, imageUrl));

        if (!includeLegacyFallback) {
            return;
        }
        String fallbackImageUrl = trimToNull(request.imageUrl());
        if (fallbackImageUrl == null) {
            return;
        }
        String targetColorway = trimToNull(request.mainColor());
        upsertColorwayImage(product, targetColorway == null ? "DEFAULT" : targetColorway, fallbackImageUrl);
        if (product.getImageUrl() == null) {
            product.setImageUrl(fallbackImageUrl);
        }
    }

    private void upsertColorwayImage(Product product, String colorwayInput, String imageUrlInput) {
        String imageUrl = trimToNull(imageUrlInput);
        if (imageUrl == null) {
            return;
        }
        String normalizedColorway = normalizeColorway(colorwayInput);
        ProductColorwayImage target = product.getColorwayImages().stream()
                .filter(entry -> normalizedColorway.equals(entry.getColorway()))
                .findFirst()
                .orElse(null);
        if (target == null) {
            target = new ProductColorwayImage();
            target.setProduct(product);
            target.setColorway(normalizedColorway);
            product.getColorwayImages().add(target);
        }
        target.setImageUrl(imageUrl);
        target.setUpdatedAt(Instant.now());
    }

    private void upsertColorwayDetails(
            Product product,
            String colorwayInput,
            String descriptionInput,
            String departmentInput,
            String categoryInput,
            String productTypeInput,
            BigDecimal priceInput
    ) {
        String normalizedColorway = normalizeColorway(colorwayInput);
        ProductColorwayDetail target = product.getColorwayDetails().stream()
                .filter(entry -> normalizedColorway.equals(normalizeColorway(entry.getColorway())))
                .findFirst()
                .orElse(null);
        if (target == null) {
            target = new ProductColorwayDetail();
            target.setProduct(product);
            product.getColorwayDetails().add(target);
        }
        target.setColorway(normalizedColorway);
        target.setDescription(trimToNull(descriptionInput));
        target.setDepartment(trimToNull(departmentInput));
        target.setCategory(trimToNull(categoryInput));
        target.setProductType(trimToNull(productTypeInput));
        target.setPrice(normalizePrice(priceInput));
        target.setUpdatedAt(Instant.now());
    }

    private String findReplacementMainColor(Product product) {
        LinkedHashSet<String> colorways = new LinkedHashSet<>();
        product.getStocks().stream()
                .map(ProductStock::getColorway)
                .map(this::normalizeColorway)
                .forEach(colorways::add);
        product.getColorwayImages().stream()
                .map(ProductColorwayImage::getColorway)
                .map(this::normalizeColorway)
                .forEach(colorways::add);
        product.getColorwayDetails().stream()
                .map(ProductColorwayDetail::getColorway)
                .map(this::normalizeColorway)
                .forEach(colorways::add);
        return colorways.stream().findFirst().orElse(null);
    }

    private String findReplacementImageUrl(Product product) {
        return product.getColorwayImages().stream()
                .map(ProductColorwayImage::getImageUrl)
                .map(this::trimToNull)
                .filter(value -> value != null)
                .findFirst()
                .orElse(null);
    }

    private String normalizeColorway(String value) {
        String normalized = trimToNull(value);
        if (normalized == null || "DEFAULT".equalsIgnoreCase(normalized)) {
            return "DEFAULT";
        }
        return ColorwayStandard.normalizeAndValidate(normalized);
    }

    private Map<Long, Long> mapViewCountByProductId(List<Product> products) {
        List<Long> productIds = new ArrayList<>();
        products.forEach(product -> {
            if (product.getId() != null) {
                productIds.add(product.getId());
            }
        });
        if (productIds.isEmpty()) {
            return Collections.emptyMap();
        }

        Map<Long, Long> byProductId = new HashMap<>();
        productViewSessionRepository.countViewsByProductIds(productIds).forEach(row ->
                byProductId.put(row.getProductId(), row.getViewCount() == null ? 0L : row.getViewCount())
        );
        return byProductId;
    }

    private PublicProductResponse toPublicResponse(Product product, Long viewCount) {
        List<SizeStockResponse> stocks = product.getStocks().stream()
                .sorted(UsSizeStandard.stockComparator())
                .map(stock -> new SizeStockResponse(
                        stock.getColorway(),
                        stock.getSizeLabel(),
                        stock.getSizeGroup(),
                        stock.getQuantity(),
                        toResponsePrice(stock.getPrice(), stock.getMarkup(), true),
                        stock.getMarkup(),
                        trimToNull(stock.getSupplier())
                ))
                .toList();
        return new PublicProductResponse(
                product.getId(),
                product.getName(),
                product.getBrand(),
                product.getDescription(),
                product.getMainColor(),
                product.getDepartment(),
                product.getCategory(),
                product.getProductType(),
                product.getImageUrl(),
                toResponsePrice(product.getPrice(), null, true),
                mapColorwayImages(product),
                mapColorwayDetails(product, true),
                stocks,
                viewCount == null ? 0L : viewCount
        );
    }

    private PublicProductResponse toAdminResponse(Product product) {
        Long viewCount = product.getId() == null ? 0L : productViewSessionRepository.countByProductId(product.getId());
        return toAdminResponse(product, viewCount);
    }

    private PublicProductResponse toAdminResponse(Product product, Long viewCount) {
        List<SizeStockResponse> stocks = product.getStocks().stream()
                .sorted(UsSizeStandard.stockComparator())
                .map(stock -> new SizeStockResponse(
                        stock.getColorway(),
                        stock.getSizeLabel(),
                        stock.getSizeGroup(),
                        stock.getQuantity(),
                        stock.getPrice(),
                        stock.getMarkup(),
                        trimToNull(stock.getSupplier())
                ))
                .toList();
        return new PublicProductResponse(
                product.getId(),
                product.getName(),
                product.getBrand(),
                product.getDescription(),
                product.getMainColor(),
                product.getDepartment(),
                product.getCategory(),
                product.getProductType(),
                product.getImageUrl(),
                toResponsePrice(product.getPrice(), null, false),
                mapColorwayImages(product),
                mapColorwayDetails(product, false),
                stocks,
                viewCount == null ? 0L : viewCount
        );
    }

    private Map<String, String> mapColorwayImages(Product product) {
        Map<String, String> values = new LinkedHashMap<>();
        product.getColorwayImages().forEach(entry -> {
            if (entry.getColorway() == null || entry.getImageUrl() == null) {
                return;
            }
            values.put(entry.getColorway(), entry.getImageUrl());
        });
        return values;
    }

    private Map<String, ColorwayDetailsResponse> mapColorwayDetails(Product product, boolean forPublicView) {
        Map<String, ColorwayDetailsResponse> values = new LinkedHashMap<>();
        Map<String, PriceRange> priceRangesByColorway = buildPriceRangesByColorway(product, forPublicView);
        product.getStocks().forEach(stock -> values.putIfAbsent(
                stock.getColorway(),
                fallbackColorwayDetails(product, stock.getColorway(), priceRangesByColorway, forPublicView)
        ));
        product.getColorwayImages().forEach(entry -> values.putIfAbsent(
                entry.getColorway(),
                fallbackColorwayDetails(product, entry.getColorway(), priceRangesByColorway, forPublicView)
        ));
        String normalizedMainColor = normalizeColorway(product.getMainColor());
        values.putIfAbsent(normalizedMainColor, fallbackColorwayDetails(product, normalizedMainColor, priceRangesByColorway, forPublicView));

        product.getColorwayDetails().forEach(entry -> {
            if (entry.getColorway() == null) {
                return;
            }
            String normalizedColorway = normalizeColorway(entry.getColorway());
            PriceRange range = priceRangesByColorway.get(normalizedColorway);
            values.put(
                    normalizedColorway,
                    new ColorwayDetailsResponse(
                            firstNonBlank(entry.getDescription(), product.getDescription()),
                            firstNonBlank(entry.getDepartment(), product.getDepartment()),
                            firstNonBlank(entry.getCategory(), product.getCategory()),
                            firstNonBlank(entry.getProductType(), product.getProductType()),
                            toResponsePrice(
                                    entry.getPrice() != null ? entry.getPrice() : resolveColorwayBasePrice(product, normalizedColorway),
                                    null,
                                    forPublicView
                            ),
                            range == null ? null : range.min(),
                            range == null ? null : range.max()
                    )
            );
        });
        return values;
    }

    private ColorwayDetailsResponse fallbackColorwayDetails(
            Product product,
            String colorway,
            Map<String, PriceRange> priceRangesByColorway,
            boolean forPublicView
    ) {
        String normalizedColorway = normalizeColorway(colorway);
        PriceRange range = priceRangesByColorway.get(normalizedColorway);
        return new ColorwayDetailsResponse(
                product.getDescription(),
                product.getDepartment(),
                product.getCategory(),
                product.getProductType(),
                toResponsePrice(resolveColorwayBasePrice(product, normalizedColorway), null, forPublicView),
                range == null ? null : range.min(),
                range == null ? null : range.max()
        );
    }

    private BigDecimal toResponsePrice(BigDecimal supplierPrice, BigDecimal markup, boolean forPublicView) {
        if (!forPublicView) {
            return supplierPrice;
        }
        return PricingPolicy.toCustomerPrice(supplierPrice, normalizeMarkup(markup));
    }

    private Map<String, PriceRange> buildPriceRangesByColorway(Product product, boolean forPublicView) {
        Map<String, BigDecimal> minByColorway = new LinkedHashMap<>();
        Map<String, BigDecimal> maxByColorway = new LinkedHashMap<>();
        Set<String> colorwaysWithExplicitPrice = new LinkedHashSet<>();

        product.getStocks().forEach(stock -> {
            String colorway = normalizeColorway(stock.getColorway());
            if (stock.getPrice() != null) {
                colorwaysWithExplicitPrice.add(colorway);
            }
            mergePriceRange(
                    minByColorway,
                    maxByColorway,
                    colorway,
                    toResponsePrice(stock.getPrice(), stock.getMarkup(), forPublicView)
            );
        });

        product.getColorwayDetails().forEach(detail -> {
            String colorway = normalizeColorway(detail.getColorway());
            if (detail.getPrice() != null) {
                colorwaysWithExplicitPrice.add(colorway);
            }
            mergePriceRange(
                    minByColorway,
                    maxByColorway,
                    colorway,
                    toResponsePrice(detail.getPrice(), null, forPublicView)
            );
        });

        LinkedHashSet<String> knownColorways = new LinkedHashSet<>();
        product.getStocks().stream().map(ProductStock::getColorway).forEach(knownColorways::add);
        product.getColorwayImages().stream().map(ProductColorwayImage::getColorway).forEach(knownColorways::add);
        product.getColorwayDetails().stream().map(ProductColorwayDetail::getColorway).forEach(knownColorways::add);
        knownColorways.add(product.getMainColor());

        knownColorways.stream()
                .map(this::normalizeColorway)
                .forEach(colorway -> {
                    if (colorwaysWithExplicitPrice.contains(colorway)) {
                        return;
                    }
                    BigDecimal fallbackPrice = resolveColorwayBasePrice(product, colorway);
                    mergePriceRange(
                            minByColorway,
                            maxByColorway,
                            colorway,
                            toResponsePrice(fallbackPrice, null, forPublicView)
                    );
                });

        Map<String, PriceRange> ranges = new LinkedHashMap<>();
        minByColorway.forEach((colorway, min) -> ranges.put(colorway, new PriceRange(min, maxByColorway.get(colorway))));
        return ranges;
    }

    private void mergePriceRange(
            Map<String, BigDecimal> minByColorway,
            Map<String, BigDecimal> maxByColorway,
            String colorway,
            BigDecimal candidate
    ) {
        if (candidate == null || candidate.compareTo(BigDecimal.ZERO) <= 0) {
            return;
        }
        minByColorway.merge(colorway, candidate, BigDecimal::min);
        maxByColorway.merge(colorway, candidate, BigDecimal::max);
    }

    private BigDecimal resolveColorwayBasePrice(Product product, String colorway) {
        String normalizedColorway = normalizeColorway(colorway);
        BigDecimal exactPrice = product.getColorwayDetails().stream()
                .filter(entry -> normalizedColorway.equals(normalizeColorway(entry.getColorway())))
                .map(ProductColorwayDetail::getPrice)
                .filter(value -> value != null)
                .findFirst()
                .orElse(null);
        if (exactPrice != null) {
            return exactPrice;
        }
        BigDecimal defaultPrice = product.getColorwayDetails().stream()
                .filter(entry -> "DEFAULT".equals(normalizeColorway(entry.getColorway())))
                .map(ProductColorwayDetail::getPrice)
                .filter(value -> value != null)
                .findFirst()
                .orElse(null);
        return defaultPrice != null ? defaultPrice : product.getPrice();
    }


    private StockSizeGroup resolveStockSizeGroup(Product product, String normalizedColorway, String requestedGroup) {
        return StockSizeGroup.forDepartment(resolveDepartmentForColorway(product, normalizedColorway), requestedGroup);
    }

    private String resolveDepartmentForColorway(Product product, String normalizedColorway) {
        String fallbackDepartment = trimToNull(product.getDepartment());
        String exactDepartment = product.getColorwayDetails().stream()
                .filter(entry -> normalizedColorway.equals(normalizeColorway(entry.getColorway())))
                .map(ProductColorwayDetail::getDepartment)
                .map(this::trimToNull)
                .filter(value -> value != null)
                .findFirst()
                .orElse(null);
        if (exactDepartment != null) {
            return exactDepartment;
        }
        return product.getColorwayDetails().stream()
                .filter(entry -> "DEFAULT".equals(normalizeColorway(entry.getColorway())))
                .map(ProductColorwayDetail::getDepartment)
                .map(this::trimToNull)
                .filter(value -> value != null)
                .findFirst()
                .orElse(fallbackDepartment);
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private BigDecimal normalizePrice(BigDecimal value) {
        if (value == null) {
            return null;
        }
        BigDecimal normalized = value.setScale(2, RoundingMode.HALF_UP);
        if (normalized.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Price must be 0 or higher.");
        }
        return normalized;
    }

    private BigDecimal normalizeMarkup(BigDecimal value) {
        if (value == null) {
            return null;
        }
        BigDecimal normalized = value.setScale(2, RoundingMode.HALF_UP);
        if (normalized.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Markup must be 0 or higher.");
        }
        return normalized;
    }

    private String firstNonBlank(String primary, String fallback) {
        String normalizedPrimary = trimToNull(primary);
        return normalizedPrimary != null ? normalizedPrimary : trimToNull(fallback);
    }

    private ProductStock resolveStockForAdjustment(
            Product product,
            Long productId,
            String normalizedColorway,
            String normalizedSize,
            String sizeGroup,
            List<ProductStock> matchingStocks,
            String normalizedSupplier,
            String referenceSupplier,
            int quantityChange
    ) {
        if (quantityChange > 0) {
            return matchingStocks.stream()
                    .filter(stock -> supplierMatches(stock.getSupplier(), normalizedSupplier))
                    .findFirst()
                    .orElseGet(() -> matchingStocks.stream()
                            .filter(stock -> stock.getSupplier() == null && stock.getQuantity() == 0)
                            .findFirst()
                            .orElseGet(() -> createStock(product, normalizedColorway, normalizedSize, sizeGroup, normalizedSupplier)));
        }

        if (referenceSupplier != null) {
            return matchingStocks.stream()
                    .filter(stock -> supplierMatches(stock.getSupplier(), referenceSupplier))
                    .findFirst()
                    .orElseThrow(() -> new IllegalArgumentException("Selected supplier batch was not found for this size."));
        }

        if (matchingStocks.size() == 1) {
            return matchingStocks.getFirst();
        }

        if (normalizedSupplier != null) {
            return matchingStocks.stream()
                    .filter(stock -> supplierMatches(stock.getSupplier(), normalizedSupplier))
                    .findFirst()
                    .orElseThrow(() -> new IllegalArgumentException("Selected supplier batch was not found for this size."));
        }

        if (matchingStocks.isEmpty()) {
            return createStock(product, normalizedColorway, normalizedSize, sizeGroup, null);
        }

        throw new IllegalArgumentException("Select a supplier from the dropdown first for sizes with multiple suppliers.");
    }

    private ProductStock createStock(
            Product product,
            String normalizedColorway,
            String normalizedSize,
            String sizeGroup,
            String supplier
    ) {
        ProductStock createdStock = new ProductStock();
        createdStock.setProduct(product);
        createdStock.setColorway(normalizedColorway);
        createdStock.setSizeLabel(normalizedSize);
        createdStock.setSizeGroup(sizeGroup);
        createdStock.setQuantity(0);
        createdStock.setPrice(resolveColorwayBasePrice(product, normalizedColorway));
        createdStock.setSupplier(supplier);
        return createdStock;
    }

    private boolean supplierMatches(String currentSupplier, String requestedSupplier) {
        return trimToNull(currentSupplier) == null
                ? trimToNull(requestedSupplier) == null
                : currentSupplier.equals(trimToNull(requestedSupplier));
    }

    private void initializeDefaultStocks(Product product) {
        String initialColorway = trimToNull(product.getMainColor());
        String normalizedColorway = initialColorway == null
                ? "DEFAULT"
                : ColorwayStandard.normalizeAndValidate(initialColorway);
        StockSizeGroup defaultGroup = resolveStockSizeGroup(product, normalizedColorway, "MEN");
        for (String size : UsSizeStandard.US_SIZES) {
            if (productStockRepository.findByProductIdAndColorwayAndSizeLabelAndSizeGroupAndSupplier(
                    product.getId(),
                    normalizedColorway,
                    size,
                    defaultGroup.name(),
                    null
            ).isPresent()) {
                continue;
            }
            ProductStock stock = new ProductStock();
            stock.setProduct(product);
            stock.setColorway(normalizedColorway);
            stock.setSizeLabel(size);
            stock.setSizeGroup(defaultGroup.name());
            stock.setQuantity(0);
            stock.setPrice(resolveColorwayBasePrice(product, normalizedColorway));
            stock.setUpdatedAt(Instant.now());
            productStockRepository.save(stock);
        }
    }

    private record PriceRange(BigDecimal min, BigDecimal max) {
    }
}
