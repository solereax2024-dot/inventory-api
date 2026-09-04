package com.solereax.inventory.order;

import static org.assertj.core.api.Assertions.assertThat;

import com.solereax.inventory.inventory.Product;
import com.solereax.inventory.inventory.ProductColorwayDetail;
import com.solereax.inventory.inventory.ProductRepository;
import com.solereax.inventory.inventory.ProductStock;
import com.solereax.inventory.inventory.ProductStockRepository;
import com.solereax.inventory.inventory.StockMovementRepository;
import com.solereax.inventory.order.dto.OrderResponse;
import com.solereax.inventory.order.dto.ReserveOrderItemRequest;
import com.solereax.inventory.order.dto.ReserveOrderRequest;
import com.solereax.inventory.pricing.PricingPolicy;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
class OrderServiceIntegrationTest {

    @Autowired
    private OrderService orderService;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private ProductStockRepository productStockRepository;

    @Autowired
    private CustomerOrderRepository customerOrderRepository;

    @Autowired
    private StockMovementRepository stockMovementRepository;

    @BeforeEach
    void setUp() {
        stockMovementRepository.deleteAll();
        customerOrderRepository.deleteAll();
        productRepository.deleteAll();
    }

    @Test
    void reserveOrderPreservesWomenDisplaySizeGroupForUnisexProducts() {
        Product product = createProduct("UNISEX", "WOMEN", 3, new BigDecimal("5999.00"));

        OrderResponse response = orderService.reserveOrder(new ReserveOrderRequest(
                "Ana",
                "09171234567",
                "",
                "GCASH",
                "",
                List.of(new ReserveOrderItemRequest(product.getId(), "WHITE", "7", "WOMEN", 1))
        ));

        ProductStock savedStock = productStockRepository.findByProductIdAndColorwayAndSizeLabelAndSizeGroup(
                        product.getId(),
                        "WHITE",
                        "7",
                        "WOMEN"
                )
                .orElseThrow();

        assertThat(response.items()).hasSize(1);
        assertThat(response.items().getFirst().sizeGroup()).isEqualTo("WOMEN");
        assertThat(response.mop()).isEqualTo("GCASH");
        assertThat(response.totalPrice()).isEqualByComparingTo(PricingPolicy.toCustomerPrice(new BigDecimal("5999.00")));
        assertThat(savedStock.getQuantity()).isEqualTo(2);
    }

    @Test
    void deleteOrderRestoresReservedStockAndRemovesReservation() {
        Product product = createProduct("MEN", "STANDARD", 5, new BigDecimal("4299.00"));

        OrderResponse reserved = orderService.reserveOrder(new ReserveOrderRequest(
                "Marco",
                "09991234567",
                "Delete test",
                "MAYA",
                "",
                List.of(new ReserveOrderItemRequest(product.getId(), "WHITE", "9", "MEN", 2))
        ));

        orderService.deleteOrder(reserved.id(), "superadmin:root");

        ProductStock restoredStock = productStockRepository.findByProductIdAndColorwayAndSizeLabelAndSizeGroup(
                        product.getId(),
                        "WHITE",
                        "9",
                        "STANDARD"
                )
                .orElseThrow();

        assertThat(customerOrderRepository.findById(reserved.id())).isEmpty();
        assertThat(restoredStock.getQuantity()).isEqualTo(5);
        assertThat(stockMovementRepository.findAll())
                .hasSize(2)
                .extracting(movement -> movement.getQuantityChange())
                .containsExactlyInAnyOrder(-2, 2);
        assertThat(stockMovementRepository.findAll())
                .extracting(movement -> movement.getReason())
                .contains("Reservation", "Reservation deleted #" + reserved.id());
    }

    @Test
    void reserveAndDeleteOrderPreserveSupplierBreakdownAcrossMultipleBatches() {
        Product product = new Product();
        product.setName("Supplier Split Test");
        product.setBrand("Test Brand");
        product.setDepartment("MEN");
        product.setMainColor("WHITE");
        product.setPrice(new BigDecimal("5000.00"));
        product.setActive(true);

        ProductColorwayDetail detail = new ProductColorwayDetail();
        detail.setProduct(product);
        detail.setColorway("WHITE");
        detail.setDepartment("MEN");
        detail.setPrice(new BigDecimal("5000.00"));
        product.getColorwayDetails().add(detail);

        ProductStock supplierOne = new ProductStock();
        supplierOne.setProduct(product);
        supplierOne.setColorway("WHITE");
        supplierOne.setSizeLabel("9");
        supplierOne.setSizeGroup("STANDARD");
        supplierOne.setQuantity(2);
        supplierOne.setPrice(new BigDecimal("5000.00"));
        supplierOne.setSupplier("Supplier 1");
        product.getStocks().add(supplierOne);

        ProductStock supplierTwo = new ProductStock();
        supplierTwo.setProduct(product);
        supplierTwo.setColorway("WHITE");
        supplierTwo.setSizeLabel("9");
        supplierTwo.setSizeGroup("STANDARD");
        supplierTwo.setQuantity(3);
        supplierTwo.setPrice(new BigDecimal("5000.00"));
        supplierTwo.setSupplier("Supplier 2");
        product.getStocks().add(supplierTwo);

        Product savedProduct = productRepository.save(product);

        OrderResponse reserved = orderService.reserveOrder(new ReserveOrderRequest(
                "Ivy",
                "09170000000",
                "Split supplier reservation",
                "BPI",
                "",
                List.of(new ReserveOrderItemRequest(savedProduct.getId(), "WHITE", "9", "MEN", 4))
        ));

        CustomerOrder savedOrder = customerOrderRepository.findByIdWithItems(reserved.id()).orElseThrow();
        List<ProductStock> reservedStocks = productStockRepository.findAllByProductIdAndColorwayAndSizeLabelAndSizeGroup(
                savedProduct.getId(),
                "WHITE",
                "9",
                "STANDARD"
        );

        assertThat(reserved.items()).hasSize(1);
        assertThat(savedOrder.getItems()).hasSize(1);
        assertThat(savedOrder.getItems().getFirst().getSupplierBreakdown())
                .contains("Supplier+1:2")
                .contains("Supplier+2:2");
        assertThat(reservedStocks)
                .extracting(ProductStock::getSupplier, ProductStock::getQuantity)
                .containsExactlyInAnyOrder(
                        org.assertj.core.groups.Tuple.tuple("Supplier 1", 0),
                        org.assertj.core.groups.Tuple.tuple("Supplier 2", 1)
                );

        orderService.deleteOrder(reserved.id(), "superadmin:root");

        List<ProductStock> restoredStocks = productStockRepository.findAllByProductIdAndColorwayAndSizeLabelAndSizeGroup(
                savedProduct.getId(),
                "WHITE",
                "9",
                "STANDARD"
        );

        assertThat(restoredStocks)
                .extracting(ProductStock::getSupplier, ProductStock::getQuantity)
                .containsExactlyInAnyOrder(
                        org.assertj.core.groups.Tuple.tuple("Supplier 1", 2),
                        org.assertj.core.groups.Tuple.tuple("Supplier 2", 3)
                );
    }

    @Test
    void reserveOrderAllowsPreOrderWhenNoStockAndDeleteDoesNotRestoreQuantity() {
        Product product = createProduct("MEN", "STANDARD", 0, new BigDecimal("5999.00"));

        OrderResponse reserved = orderService.reserveOrder(new ReserveOrderRequest(
                "Paolo",
                "09990001111",
                "Pre-order when out of stock",
                "OTHER",
                "UnionBank",
                List.of(new ReserveOrderItemRequest(product.getId(), "WHITE", "9", "MEN", 1))
        ));

        ProductStock stockAfterReserve = productStockRepository.findByProductIdAndColorwayAndSizeLabelAndSizeGroup(
                        product.getId(),
                        "WHITE",
                        "9",
                        "STANDARD"
                )
                .orElseThrow();

        assertThat(reserved.items()).hasSize(1);
        assertThat(reserved.mop()).isEqualTo("OTHER");
        assertThat(reserved.mopOther()).isEqualTo("UnionBank");
        assertThat(reserved.totalPrice()).isEqualByComparingTo(PricingPolicy.toCustomerPrice(new BigDecimal("5999.00")));
        assertThat(stockAfterReserve.getQuantity()).isZero();

        orderService.deleteOrder(reserved.id(), "superadmin:root");

        ProductStock stockAfterDelete = productStockRepository.findByProductIdAndColorwayAndSizeLabelAndSizeGroup(
                        product.getId(),
                        "WHITE",
                        "9",
                        "STANDARD"
                )
                .orElseThrow();
        assertThat(stockAfterDelete.getQuantity()).isZero();
    }

    private Product createProduct(String department, String stockSizeGroup, int quantity, BigDecimal price) {
        Product product = new Product();
        product.setName("Test Sneaker " + department + " " + stockSizeGroup);
        product.setBrand("Test Brand");
        product.setDepartment(department);
        product.setMainColor("WHITE");
        product.setPrice(price);
        product.setActive(true);

        ProductColorwayDetail detail = new ProductColorwayDetail();
        detail.setProduct(product);
        detail.setColorway("WHITE");
        detail.setDepartment(department);
        detail.setPrice(price);
        product.getColorwayDetails().add(detail);

        ProductStock stock = new ProductStock();
        stock.setProduct(product);
        stock.setColorway("WHITE");
        stock.setSizeLabel("WOMEN".equals(stockSizeGroup) ? "7" : "9");
        stock.setSizeGroup(stockSizeGroup);
        stock.setQuantity(quantity);
        stock.setPrice(price);
        product.getStocks().add(stock);

        return productRepository.save(product);
    }
}

