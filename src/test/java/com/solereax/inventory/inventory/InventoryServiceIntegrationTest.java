package com.solereax.inventory.inventory;

import static org.assertj.core.api.Assertions.assertThat;

import com.solereax.inventory.inventory.dto.AdminAdjustStockRequest;
import com.solereax.inventory.inventory.dto.PublicProductResponse;
import com.solereax.inventory.order.CustomerOrderRepository;
import java.math.BigDecimal;
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

    @BeforeEach
    void setUp() {
        stockMovementRepository.deleteAll();
        customerOrderRepository.deleteAll();
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
}

