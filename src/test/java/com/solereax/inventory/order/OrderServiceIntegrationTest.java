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
        assertThat(response.totalPrice()).isEqualByComparingTo("5999.00");
        assertThat(savedStock.getQuantity()).isEqualTo(2);
    }

    @Test
    void deleteOrderRestoresReservedStockAndRemovesReservation() {
        Product product = createProduct("MEN", "STANDARD", 5, new BigDecimal("4299.00"));

        OrderResponse reserved = orderService.reserveOrder(new ReserveOrderRequest(
                "Marco",
                "09991234567",
                "Delete test",
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

