package com.solereax.inventory.inventory;

import java.util.Optional;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import jakarta.persistence.LockModeType;

public interface ProductStockRepository extends JpaRepository<ProductStock, Long> {
    Optional<ProductStock> findByProductIdAndColorwayAndSizeLabelAndSizeGroup(
            Long productId,
            String colorway,
            String sizeLabel,
            String sizeGroup
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select ps from ProductStock ps
            where ps.product.id = :productId
              and ps.colorway = :colorway
              and ps.sizeLabel = :sizeLabel
              and ps.sizeGroup = :sizeGroup
            """)
    Optional<ProductStock> findForUpdate(Long productId, String colorway, String sizeLabel, String sizeGroup);

    void deleteByProductId(Long productId);
}
