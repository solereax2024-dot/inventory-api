package com.solereax.inventory.inventory;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface StockMovementRepository extends JpaRepository<StockMovement, Long> {
    interface StockStateAggregate {
        String getColorway();
        String getReason();
        Integer getQuantity();
    }

    interface StockStateSizeAggregate {
        String getColorway();
        String getSizeGroup();
        String getSizeLabel();
        String getReason();
        Integer getQuantity();
    }

    @Query("""
            select ps.colorway as colorway, sm.reason as reason, sum(sm.quantityChange) as quantity
            from StockMovement sm
            join sm.productStock ps
            where ps.product.id = :productId
            group by ps.colorway, sm.reason
            """)
    List<StockStateAggregate> summarizeStateByProduct(Long productId);

    @Query("""
            select ps.colorway as colorway, ps.sizeGroup as sizeGroup, ps.sizeLabel as sizeLabel, sm.reason as reason, sum(sm.quantityChange) as quantity
            from StockMovement sm
            join sm.productStock ps
            where ps.product.id = :productId
            group by ps.colorway, ps.sizeGroup, ps.sizeLabel, sm.reason
            """)
    List<StockStateSizeAggregate> summarizeStateByProductAndSize(Long productId);
}
