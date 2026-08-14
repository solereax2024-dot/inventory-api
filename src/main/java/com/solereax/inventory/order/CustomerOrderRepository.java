package com.solereax.inventory.order;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface CustomerOrderRepository extends JpaRepository<CustomerOrder, Long> {
    @Query("select distinct o from CustomerOrder o left join fetch o.items i order by o.createdAt desc")
    List<CustomerOrder> findAllWithItems();

    @Query("select o from CustomerOrder o left join fetch o.items where o.id = :id")
    Optional<CustomerOrder> findByIdWithItems(Long id);
}
