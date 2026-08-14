package com.solereax.inventory.inventory;

import java.util.Optional;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import jakarta.persistence.LockModeType;

public interface ProductStockRepository extends JpaRepository<ProductStock, Long> {
    Optional<ProductStock> findByProductIdAndColorwayAndSizeLabel(Long productId, String colorway, String sizeLabel);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select ps from ProductStock ps where ps.product.id = :productId and ps.colorway = :colorway and ps.sizeLabel = :sizeLabel")
    Optional<ProductStock> findForUpdate(Long productId, String colorway, String sizeLabel);

    void deleteByProductId(Long productId);
}
