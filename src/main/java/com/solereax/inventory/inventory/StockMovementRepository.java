package com.solereax.inventory.inventory;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface StockMovementRepository extends JpaRepository<StockMovement, Long> {
	interface RecentReservationSoldProjection {
		Long getProductStockId();

		Long getSoldQuantity();
	}

	@Query("""
			select sm.productStock.id as productStockId, sum(-sm.quantityChange) as soldQuantity
			from StockMovement sm
			where sm.productStock.id in :stockIds
			  and sm.quantityChange < 0
			  and sm.reason = 'Reservation'
			  and sm.createdAt >= :cutoff
			group by sm.productStock.id
			""")
	List<RecentReservationSoldProjection> findRecentReservationSoldByStockIds(
			@Param("stockIds") Collection<Long> stockIds,
			@Param("cutoff") Instant cutoff
	);
}
