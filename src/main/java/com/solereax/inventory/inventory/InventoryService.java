package com.solereax.inventory.inventory;

import com.solereax.inventory.inventory.dto.AdminAdjustStockRequest;
import com.solereax.inventory.inventory.dto.AdminCreateProductRequest;
import com.solereax.inventory.inventory.dto.AdminUpdateColorwayDetailsRequest;
import com.solereax.inventory.inventory.dto.ColorwayDetailsResponse;
import com.solereax.inventory.inventory.dto.PublicProductResponse;
import com.solereax.inventory.inventory.dto.SizeStockResponse;
import com.solereax.inventory.shared.NotFoundException;
import java.time.Instant;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InventoryService {
    private final ProductRepository productRepository;
    private final ProductStockRepository productStockRepository;
    private final StockMovementRepository stockMovementRepository;

    public InventoryService(
            ProductRepository productRepository,
            ProductStockRepository productStockRepository,
            StockMovementRepository stockMovementRepository
    ) {
        this.productRepository = productRepository;
        this.productStockRepository = productStockRepository;
        this.stockMovementRepository = stockMovementRepository;
    }

    @Transactional(readOnly = true)
    public List<PublicProductResponse> listPublicProducts() {
        return productRepository.findAllActiveWithStocks()
                .stream()
                .map(this::toPublicResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<PublicProductResponse> listAdminProducts() {
        return productRepository.findAllWithStocks()
                .stream()
                .map(this::toAdminResponse)
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
        upsertColorwayDetails(product, product.getMainColor(), request.description(), request.department(), request.category(), request.productType());
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
                request.productType()
        );
        Product saved = productRepository.save(product);
        return toAdminResponse(saved);
    }

    @Transactional
    public PublicProductResponse adjustStock(Long productId, AdminAdjustStockRequest request, String changedBy) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new NotFoundException("Product not found: " + productId));

        String normalizedSize = UsSizeStandard.normalizeAndValidate(request.size());
        String normalizedColorway = ColorwayStandard.normalizeAndValidate(request.colorway());
        ProductStock stock = productStockRepository
                .findByProductIdAndColorwayAndSizeLabel(productId, normalizedColorway, normalizedSize)
                .orElseGet(() -> {
                    ProductStock createdStock = new ProductStock();
                    createdStock.setProduct(product);
                    createdStock.setColorway(normalizedColorway);
                    createdStock.setSizeLabel(normalizedSize);
                    createdStock.setQuantity(0);
                    return createdStock;
                });

        int newQuantity = stock.getQuantity() + request.quantityChange();
        if (newQuantity < 0) {
            throw new IllegalArgumentException(
                    "Stock cannot go below zero for colorway " + normalizedColorway + " size " + normalizedSize
            );
        }

        stock.setQuantity(newQuantity);
        stock.setUpdatedAt(Instant.now());
        ProductStock savedStock = productStockRepository.save(stock);

        StockMovement movement = new StockMovement();
        movement.setProductStock(savedStock);
        movement.setQuantityChange(request.quantityChange());
        movement.setReason(request.stockSourceType().name());
        movement.setChangedBy(changedBy);
        stockMovementRepository.save(movement);

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
            String productTypeInput
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
        target.setUpdatedAt(Instant.now());
    }

    private String normalizeColorway(String value) {
        String normalized = trimToNull(value);
        if (normalized == null || "DEFAULT".equalsIgnoreCase(normalized)) {
            return "DEFAULT";
        }
        return ColorwayStandard.normalizeAndValidate(normalized);
    }

    private PublicProductResponse toPublicResponse(Product product) {
        List<SizeStockResponse> stocks = product.getStocks().stream()
                .sorted(UsSizeStandard.stockComparator())
                .map(stock -> new SizeStockResponse(stock.getColorway(), stock.getSizeLabel(), stock.getQuantity()))
                .toList();
        Map<String, Map<String, Map<String, Integer>>> stateByColorwayAndSize = buildStateByColorwayAndSize(product);
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
                mapColorwayImages(product),
                mapColorwayDetails(product),
                stocks,
                aggregateStateByColorway(stateByColorwayAndSize),
                stateByColorwayAndSize
        );
    }

    private PublicProductResponse toAdminResponse(Product product) {
        List<SizeStockResponse> stocks = product.getStocks().stream()
                .sorted(UsSizeStandard.stockComparator())
                .map(stock -> new SizeStockResponse(stock.getColorway(), stock.getSizeLabel(), stock.getQuantity()))
                .toList();
        Map<String, Map<String, Map<String, Integer>>> stateByColorwayAndSize = buildStateByColorwayAndSize(product);
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
                mapColorwayImages(product),
                mapColorwayDetails(product),
                stocks,
                aggregateStateByColorway(stateByColorwayAndSize),
                stateByColorwayAndSize
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

    private Map<String, ColorwayDetailsResponse> mapColorwayDetails(Product product) {
        Map<String, ColorwayDetailsResponse> values = new LinkedHashMap<>();
        product.getStocks().forEach(stock -> values.putIfAbsent(stock.getColorway(), fallbackColorwayDetails(product)));
        product.getColorwayImages().forEach(entry -> values.putIfAbsent(entry.getColorway(), fallbackColorwayDetails(product)));
        values.putIfAbsent(normalizeColorway(product.getMainColor()), fallbackColorwayDetails(product));

        product.getColorwayDetails().forEach(entry -> {
            if (entry.getColorway() == null) {
                return;
            }
            values.put(
                    normalizeColorway(entry.getColorway()),
                    new ColorwayDetailsResponse(
                            firstNonBlank(entry.getDescription(), product.getDescription()),
                            firstNonBlank(entry.getDepartment(), product.getDepartment()),
                            firstNonBlank(entry.getCategory(), product.getCategory()),
                            firstNonBlank(entry.getProductType(), product.getProductType())
                    )
            );
        });
        return values;
    }

    private ColorwayDetailsResponse fallbackColorwayDetails(Product product) {
        return new ColorwayDetailsResponse(
                product.getDescription(),
                product.getDepartment(),
                product.getCategory(),
                product.getProductType()
        );
    }

    private Map<String, Map<String, Integer>> aggregateStateByColorway(
            Map<String, Map<String, Map<String, Integer>>> stateByColorwayAndSize
    ) {
        Map<String, Map<String, Integer>> stateByColorway = new LinkedHashMap<>();
        stateByColorwayAndSize.forEach((colorway, bySize) -> {
            Map<String, Integer> totals = emptyStateValues();
            bySize.values().forEach(byState -> byState.forEach(
                    (state, quantity) -> totals.put(state, totals.getOrDefault(state, 0) + quantity)
            ));
            stateByColorway.put(colorway, totals);
        });
        return stateByColorway;
    }

    private Map<String, Integer> emptyStateValues() {
        Map<String, Integer> values = new LinkedHashMap<>();
        values.put(StockSourceType.ON_HAND.name(), 0);
        values.put(StockSourceType.IN_TRANSIT.name(), 0);
        values.put(StockSourceType.PRE_ORDER.name(), 0);
        return values;
    }

    private Map<String, Map<String, Map<String, Integer>>> buildStateByColorwayAndSize(Product product) {
        Map<String, Map<String, Map<String, Integer>>> stateByColorwaySize = new LinkedHashMap<>();
        product.getStocks().forEach(stock -> stateByColorwaySize
                .computeIfAbsent(stock.getColorway(), ignored -> new LinkedHashMap<>())
                .put(stock.getSizeLabel(), emptyStateValues()));

        stockMovementRepository.summarizeStateByProductAndSize(product.getId()).forEach(aggregate -> {
            String colorway = aggregate.getColorway();
            String sizeLabel = aggregate.getSizeLabel();
            String reason = aggregate.getReason();
            Integer quantity = aggregate.getQuantity();
            if (colorway == null || sizeLabel == null || reason == null || quantity == null) {
                return;
            }
            if (!isKnownStockState(reason)) {
                return;
            }
            stateByColorwaySize
                    .computeIfAbsent(colorway, ignored -> new LinkedHashMap<>())
                    .computeIfAbsent(sizeLabel, ignored -> emptyStateValues())
                    .put(reason, quantity);
        });

        // Keep matrix totals aligned with current stock quantities.
        product.getStocks().forEach(stock -> {
            Map<String, Integer> byState = stateByColorwaySize
                    .computeIfAbsent(stock.getColorway(), ignored -> new LinkedHashMap<>())
                    .computeIfAbsent(stock.getSizeLabel(), ignored -> emptyStateValues());
            int tracked = byState.values().stream().mapToInt(Integer::intValue).sum();
            int diff = stock.getQuantity() - tracked;
            if (diff != 0) {
                byState.put(StockSourceType.ON_HAND.name(), byState.getOrDefault(StockSourceType.ON_HAND.name(), 0) + diff);
            }
        });
        return stateByColorwaySize;
    }

    private boolean isKnownStockState(String reason) {
        for (StockSourceType value : StockSourceType.values()) {
            if (value.name().equals(reason)) {
                return true;
            }
        }
        return false;
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String firstNonBlank(String primary, String fallback) {
        String normalizedPrimary = trimToNull(primary);
        return normalizedPrimary != null ? normalizedPrimary : trimToNull(fallback);
    }

    private void initializeDefaultStocks(Product product) {
        String initialColorway = trimToNull(product.getMainColor());
        String normalizedColorway = initialColorway == null
                ? "DEFAULT"
                : ColorwayStandard.normalizeAndValidate(initialColorway);
        for (String size : UsSizeStandard.US_SIZES) {
            if (productStockRepository.findByProductIdAndColorwayAndSizeLabel(product.getId(), normalizedColorway, size).isPresent()) {
                continue;
            }
            ProductStock stock = new ProductStock();
            stock.setProduct(product);
            stock.setColorway(normalizedColorway);
            stock.setSizeLabel(size);
            stock.setQuantity(0);
            stock.setUpdatedAt(Instant.now());
            productStockRepository.save(stock);
        }
    }
}
