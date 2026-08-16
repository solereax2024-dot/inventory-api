package com.solereax.inventory.inventory;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProductRepository extends JpaRepository<Product, Long> {
    @Query("""
            select distinct p from Product p
            left join fetch p.stocks s
            left join fetch p.colorwayImages c
            left join fetch p.colorwayDetails d
            where p.active = true
            order by p.name
            """)
    List<Product> findAllActiveWithStocks();

    @Query("""
            select distinct p from Product p
            left join fetch p.stocks s
            left join fetch p.colorwayImages c
            left join fetch p.colorwayDetails d
            order by p.name
            """)
    List<Product> findAllWithStocks();

    @Query("select p from Product p where p.id = :id")
    Optional<Product> findManagedById(Long id);

    Optional<Product> findByBrandAndName(String brand, String name);

    @Query("""
            select p from Product p
            where lower(p.name) = lower(:name)
              and lower(coalesce(p.brand, '')) = lower(coalesce(:brand, ''))
            """)
    Optional<Product> findByBrandAndNameIgnoreCase(@Param("brand") String brand, @Param("name") String name);
}
