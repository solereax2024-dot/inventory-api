package com.solereax.inventory.inventory;

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
			select sm.productStock.id as productStockId,
			       sum(
			         case
			           when sm.reason = 'Reservation' and sm.quantityChange < 0 then -sm.quantityChange
			           when sm.reason like 'Reservation deleted #%'
			                and sm.quantityChange > 0 then -sm.quantityChange
			           else 0
			         end
			       ) as soldQuantity
			from StockMovement sm
			where sm.productStock.id in :stockIds
			  and (sm.reason = 'Reservation' or sm.reason like 'Reservation deleted #%')
			group by sm.productStock.id
			""")
	List<RecentReservationSoldProjection> findRecentReservationSoldByStockIds(@Param("stockIds") Collection<Long> stockIds);
}
