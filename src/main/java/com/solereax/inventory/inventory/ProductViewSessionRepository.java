package com.solereax.inventory.inventory;

import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProductViewSessionRepository extends JpaRepository<ProductViewSession, Long> {
    boolean existsByProductIdAndSessionIdAndColorwayKey(Long productId, String sessionId, String colorwayKey);

    long countByProductId(Long productId);

    @Query("""
            select pvs.product.id as productId, count(pvs.id) as viewCount
            from ProductViewSession pvs
            where pvs.product.id in :productIds
            group by pvs.product.id
            """)
    List<ProductViewCountProjection> countViewsByProductIds(@Param("productIds") List<Long> productIds);

    @Query("""
            select p.id as productId, pvs.colorwayKey as colorwayKey, p.name as name, p.brand as brand, count(pvs.id) as viewCount
            from ProductViewSession pvs
            join pvs.product p
            where p.active = true
              and pvs.colorwayKey <> 'DEFAULT'
            group by p.id, pvs.colorwayKey, p.name, p.brand
            order by count(pvs.id) desc, p.name asc, pvs.colorwayKey asc
            """)
    List<TopViewedProductProjection> findTopViewedProducts(Pageable pageable);
}

