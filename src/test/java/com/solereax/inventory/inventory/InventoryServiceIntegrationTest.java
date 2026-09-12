package com.solereax.inventory.inventory;

import static org.assertj.core.api.Assertions.assertThat;

import com.solereax.inventory.inventory.dto.AdminAdjustStockRequest;
import com.solereax.inventory.inventory.dto.PublicCatalogPageResponse;
import com.solereax.inventory.inventory.dto.PublicProductResponse;
import com.solereax.inventory.order.CustomerOrderRepository;
import com.solereax.inventory.promotion.Promotion;
import com.solereax.inventory.promotion.PromotionDiscountType;
import com.solereax.inventory.promotion.PromotionRepository;
import com.solereax.inventory.promotion.PromotionService;
import com.solereax.inventory.promotion.PromotionTargetingSupport;
import com.solereax.inventory.promotion.dto.PromotionValidationResponse;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
class InventoryServiceIntegrationTest {

    @Autowired
    private InventoryService inventoryService;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private ProductStockRepository productStockRepository;

    @Autowired
    private StockMovementRepository stockMovementRepository;

    @Autowired
    private CustomerOrderRepository customerOrderRepository;

    @Autowired
    private PromotionRepository promotionRepository;

    @Autowired
    private PromotionService promotionService;

    @BeforeEach
    void setUp() {
        stockMovementRepository.deleteAll();
        customerOrderRepository.deleteAll();
        promotionRepository.deleteAll();
        productRepository.deleteAll();
    }

    @Test
    void adjustStockCreatesSeparateSupplierBatchesForSameSize() {
        Product product = new Product();
        product.setName("Inventory Supplier Split Test");
        product.setBrand("Test Brand");
        product.setDepartment("MEN");
        product.setMainColor("WHITE");
        product.setPrice(new BigDecimal("4500.00"));
        product.setActive(true);

        ProductColorwayDetail detail = new ProductColorwayDetail();
        detail.setProduct(product);
        detail.setColorway("WHITE");
        detail.setDepartment("MEN");
        detail.setPrice(new BigDecimal("4500.00"));
        product.getColorwayDetails().add(detail);

        ProductStock placeholder = new ProductStock();
        placeholder.setProduct(product);
        placeholder.setColorway("WHITE");
        placeholder.setSizeLabel("9");
        placeholder.setSizeGroup("STANDARD");
        placeholder.setQuantity(0);
        placeholder.setPrice(new BigDecimal("4500.00"));
        product.getStocks().add(placeholder);

        Product savedProduct = productRepository.save(product);

        inventoryService.adjustStock(savedProduct.getId(), new AdminAdjustStockRequest(
                "9",
                "WHITE",
                "MEN",
                3,
                null,
                null,
                null,
                "Supplier 1",
                null,
                null,
                null
        ), "admin:test");

        PublicProductResponse response = inventoryService.adjustStock(savedProduct.getId(), new AdminAdjustStockRequest(
                "9",
                "WHITE",
                "MEN",
                2,
                null,
                null,
                null,
                "Supplier 2",
                null,
                null,
                null
        ), "admin:test");

        List<ProductStock> stocks = productStockRepository.findAllByProductIdAndColorwayAndSizeLabelAndSizeGroup(
                savedProduct.getId(),
                "WHITE",
                "9",
                "STANDARD"
        );

        assertThat(stocks)
                .extracting(ProductStock::getSupplier, ProductStock::getQuantity)
                .containsExactlyInAnyOrder(
                        org.assertj.core.groups.Tuple.tuple("Supplier 1", 3),
                        org.assertj.core.groups.Tuple.tuple("Supplier 2", 2)
                );
        assertThat(response.stocks())
                .filteredOn(stock -> "WHITE".equals(stock.colorway()) && "9".equals(stock.size()))
                .extracting(stock -> stock.supplier(), stock -> stock.quantity())
                .containsExactlyInAnyOrder(
                        org.assertj.core.groups.Tuple.tuple("Supplier 1", 3),
                        org.assertj.core.groups.Tuple.tuple("Supplier 2", 2)
                );
    }

    @Test
    void listAdminProductsBuildsPriceRangesPerColorwayFromStockPrices() {
        Product product = new Product();
        product.setName("Per Colorway Range Test");
        product.setBrand("Test Brand");
        product.setDepartment("MEN");
        product.setCategory("FOOTWEAR");
        product.setProductType("LIFESTYLE_SNEAKERS");
        product.setMainColor("RED");
        product.setPrice(new BigDecimal("8000.00"));
        product.setActive(true);

        ProductColorwayDetail redDetail = new ProductColorwayDetail();
        redDetail.setProduct(product);
        redDetail.setColorway("RED");
        redDetail.setDepartment("MEN");
        redDetail.setPrice(new BigDecimal("8000.00"));
        product.getColorwayDetails().add(redDetail);

        ProductColorwayDetail orangeDetail = new ProductColorwayDetail();
        orangeDetail.setProduct(product);
        orangeDetail.setColorway("ORANGE");
        orangeDetail.setDepartment("MEN");
        orangeDetail.setPrice(new BigDecimal("8000.00"));
        product.getColorwayDetails().add(orangeDetail);

        ProductStock redSizeSix = new ProductStock();
        redSizeSix.setProduct(product);
        redSizeSix.setColorway("RED");
        redSizeSix.setSizeLabel("6");
        redSizeSix.setSizeGroup("STANDARD");
        redSizeSix.setQuantity(1);
        redSizeSix.setPrice(new BigDecimal("8000.00"));
        product.getStocks().add(redSizeSix);

        ProductStock redSizeFive = new ProductStock();
        redSizeFive.setProduct(product);
        redSizeFive.setColorway("RED");
        redSizeFive.setSizeLabel("5");
        redSizeFive.setSizeGroup("STANDARD");
        redSizeFive.setQuantity(1);
        redSizeFive.setPrice(new BigDecimal("9000.00"));
        product.getStocks().add(redSizeFive);

        ProductStock orangeSizeSix = new ProductStock();
        orangeSizeSix.setProduct(product);
        orangeSizeSix.setColorway("ORANGE");
        orangeSizeSix.setSizeLabel("6");
        orangeSizeSix.setSizeGroup("STANDARD");
        orangeSizeSix.setQuantity(1);
        orangeSizeSix.setPrice(new BigDecimal("9000.00"));
        product.getStocks().add(orangeSizeSix);

        productRepository.save(product);

        PublicProductResponse response = inventoryService.listAdminProducts().stream()
                .filter(item -> "Per Colorway Range Test".equals(item.name()))
                .findFirst()
                .orElseThrow();

        assertThat(response.colorwayDetails().get("RED").minPrice()).isEqualByComparingTo("8000.00");
        assertThat(response.colorwayDetails().get("RED").maxPrice()).isEqualByComparingTo("9000.00");
        assertThat(response.colorwayDetails().get("ORANGE").minPrice()).isEqualByComparingTo("9000.00");
        assertThat(response.colorwayDetails().get("ORANGE").maxPrice()).isEqualByComparingTo("9000.00");
    }

    @Test
    void getPublicProductIgnoresZeroQuantityPlaceholderPricesWhenAvailableStockExists() {
        Product product = new Product();
        product.setName("Public Price Range Availability Test");
        product.setBrand("Test Brand");
        product.setDescription("Availability-aware pricing");
        product.setDepartment("WOMEN");
        product.setCategory("FOOTWEAR");
        product.setProductType("TENNIS_SHOES");
        product.setMainColor("WHITE SABA BLUE");
        product.setPrice(new BigDecimal("10500.00"));
        product.setActive(true);

        ProductColorwayDetail detail = new ProductColorwayDetail();
        detail.setProduct(product);
        detail.setColorway("WHITE SABA BLUE");
        detail.setDepartment("WOMEN");
        detail.setCategory("FOOTWEAR");
        detail.setProductType("TENNIS_SHOES");
        detail.setPrice(new BigDecimal("10500.00"));
        product.getColorwayDetails().add(detail);

        ProductStock placeholder = new ProductStock();
        placeholder.setProduct(product);
        placeholder.setColorway("WHITE SABA BLUE");
        placeholder.setSizeLabel("8");
        placeholder.setSizeGroup("STANDARD");
        placeholder.setQuantity(0);
        placeholder.setPrice(new BigDecimal("10500.00"));
        product.getStocks().add(placeholder);

        ProductStock available = new ProductStock();
        available.setProduct(product);
        available.setColorway("WHITE SABA BLUE");
        available.setSizeLabel("6");
        available.setSizeGroup("STANDARD");
        available.setQuantity(1);
        available.setPrice(new BigDecimal("7700.00"));
        available.setMarkup(new BigDecimal("2000.00"));
        product.getStocks().add(available);

        Product savedProduct = productRepository.save(product);

        PublicProductResponse response = inventoryService.getPublicProduct(savedProduct.getId());

        assertThat(response.colorwayDetails().get("WHITE SABA BLUE").minPrice()).isEqualByComparingTo("9700.00");
        assertThat(response.colorwayDetails().get("WHITE SABA BLUE").maxPrice()).isEqualByComparingTo("9700.00");
    }

    @Test
    void listPublicCatalogSaleIncludesScheduledSalePromotions() {
        Product product = new Product();
        product.setName("Scheduled Sale Test");
        product.setBrand("Launch Brand");
        product.setDescription("Upcoming sale product");
        product.setDepartment("MEN");
        product.setCategory("FOOTWEAR");
        product.setProductType("RUNNING_SHOES");
        product.setMainColor("BLACK");
        product.setPrice(new BigDecimal("10000.00"));
        product.setActive(true);

        ProductColorwayDetail detail = new ProductColorwayDetail();
        detail.setProduct(product);
        detail.setColorway("BLACK");
        detail.setDepartment("MEN");
        detail.setCategory("FOOTWEAR");
        detail.setProductType("RUNNING_SHOES");
        detail.setPrice(new BigDecimal("10000.00"));
        product.getColorwayDetails().add(detail);

        ProductStock stock = new ProductStock();
        stock.setProduct(product);
        stock.setColorway("BLACK");
        stock.setSizeLabel("8");
        stock.setSizeGroup("STANDARD");
        stock.setQuantity(2);
        stock.setPrice(new BigDecimal("8000.00"));
        stock.setMarkup(new BigDecimal("2000.00"));
        product.getStocks().add(stock);

        Product savedProduct = productRepository.save(product);

        Promotion promotion = new Promotion();
        promotion.setCode("SALE-AUTO-SCHEDULED-1");
        promotion.setName("9.9 Early Access");
        promotion.setDescription("[SALE] Scheduled launch promo");
        promotion.setDiscountType(PromotionDiscountType.PERCENT);
        promotion.setDiscountValue(new BigDecimal("20.00"));
        promotion.setStartsAt(Instant.now().plus(2, ChronoUnit.DAYS));
        promotion.setEndsAt(Instant.now().plus(5, ChronoUnit.DAYS));
        promotion.setActive(true);
        promotion.setTargetProductIds(String.valueOf(savedProduct.getId()));
        promotionRepository.save(promotion);

        PublicCatalogPageResponse response = inventoryService.listPublicCatalog(
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                true,
                "COLORWAY",
                null,
                "BRAND_ASC",
                1,
                16
        );

        assertThat(response.totalElements()).isEqualTo(1);
        assertThat(response.items()).hasSize(1);
        assertThat(response.items().getFirst().salePromotions()).hasSize(1);
        assertThat(response.items().getFirst().salePromotions().getFirst().name()).isEqualTo("9.9 Early Access");
        assertThat(response.items().getFirst().salePromotions().getFirst().activeNow()).isFalse();
        assertThat(response.items().getFirst().salePromotions().getFirst().startsAt()).isEqualTo(promotion.getStartsAt());
    }

    @Test
    void resolveAutoSalePromotionIgnoresScheduledPromotionsBeforeStart() {
        Product product = new Product();
        product.setName("Scheduled Sale Auto Apply Test");
        product.setBrand("Launch Brand");
        product.setDepartment("MEN");
        product.setCategory("FOOTWEAR");
        product.setProductType("RUNNING_SHOES");
        product.setMainColor("BLACK");
        product.setPrice(new BigDecimal("10000.00"));
        product.setActive(true);

        ProductStock stock = new ProductStock();
        stock.setProduct(product);
        stock.setColorway("BLACK");
        stock.setSizeLabel("8");
        stock.setSizeGroup("STANDARD");
        stock.setQuantity(2);
        stock.setPrice(new BigDecimal("8000.00"));
        stock.setMarkup(new BigDecimal("2000.00"));
        product.getStocks().add(stock);

        Product savedProduct = productRepository.save(product);

        Promotion promotion = new Promotion();
        promotion.setCode("SALE-AUTO-SCHEDULED-2");
        promotion.setName("Flash Weekend");
        promotion.setDescription("[SALE] Scheduled auto-sale");
        promotion.setDiscountType(PromotionDiscountType.FIXED);
        promotion.setDiscountValue(new BigDecimal("500.00"));
        promotion.setStartsAt(Instant.now().plus(1, ChronoUnit.DAYS));
        promotion.setEndsAt(Instant.now().plus(3, ChronoUnit.DAYS));
        promotion.setActive(true);
        promotion.setTargetProductIds(String.valueOf(savedProduct.getId()));
        promotionRepository.save(promotion);

        PromotionValidationResponse response = promotionService.resolveAutoSalePromotion(
                new BigDecimal("10000.00"),
                List.of(new PromotionTargetingSupport.PromotionLineItem(
                        savedProduct.getId(),
                        savedProduct.getBrand(),
                        savedProduct.getCategory(),
                        savedProduct.getProductType(),
                        false,
                        1
                ))
        );

        assertThat(response.valid()).isFalse();
        assertThat(response.discountAmount()).isEqualByComparingTo("0.00");
        assertThat(response.totalAfterDiscount()).isEqualByComparingTo("10000.00");
    }
}

