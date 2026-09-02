package com.solereax.inventory.inventory;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "product_stocks")
public class ProductStock {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(name = "size_label", nullable = false, length = 20)
    private String sizeLabel;

    @Column(nullable = false, length = 80)
    private String colorway;

    @Column(name = "size_group", nullable = false, length = 20)
    private String sizeGroup = StockSizeGroup.STANDARD.name();

    @Column(nullable = false)
    private int quantity;

    @Column(name = "price", precision = 12, scale = 2)
    private BigDecimal price;

    @Column(name = "markup", precision = 12, scale = 2)
    private BigDecimal markup;

    @Column(name = "supplier", length = 140)
    private String supplier;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();
}
