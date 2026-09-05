package com.solereax.inventory.inventory;

import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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
            where p.id = :id
              and p.active = true
            """)
    Optional<Product> findActiveByIdWithStocks(@Param("id") Long id);

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

    @Query("""
            select distinct p from Product p
            left join fetch p.colorwayImages c
            where p.id = :id and p.active = true
            """)
    Optional<Product> findActiveByIdWithColorwayImages(@Param("id") Long id);

    Optional<Product> findByBrandAndName(String brand, String name);

    @Query("""
            select p from Product p
            where lower(p.name) = lower(:name)
              and lower(coalesce(p.brand, '')) = lower(coalesce(:brand, ''))
            """)
    Optional<Product> findByBrandAndNameIgnoreCase(@Param("brand") String brand, @Param("name") String name);

    @Query("""
            select p.id from Product p
            where p.active = true
              and (:brand is null or lower(coalesce(p.brand, '')) = :brand)
              and (:department is null or upper(coalesce(p.department, '')) = :department)
              and (:category is null or upper(coalesce(p.category, '')) = :category)
              and (:productType is null or upper(coalesce(p.productType, '')) = :productType)
              and (
                  :searchPattern is null
                  or lower(coalesce(p.name, '')) like :searchPattern
                  or lower(coalesce(p.brand, '')) like :searchPattern
                  or lower(coalesce(p.department, '')) like :searchPattern
                  or lower(coalesce(p.category, '')) like :searchPattern
                  or lower(coalesce(p.productType, '')) like :searchPattern
              )
              and (
                  :colorway is null
                  or exists (
                      select 1 from ProductStock s
                      where s.product = p
                        and upper(coalesce(s.colorway, '')) = :colorway
                  )
              )
              and (
                  (:sizeLabel is null and :stockFilter is null)
                  or (
                      :sizeLabel is not null
                      and (
                          (:stockFilter = 'OUT_OF_STOCK' and not exists (
                              select 1 from ProductStock s
                              where s.product = p
                                and (:colorway is null or upper(coalesce(s.colorway, '')) = :colorway)
                                and upper(coalesce(s.sizeLabel, '')) = :sizeLabel
                                and s.quantity > 0
                          ))
                          or (:stockFilter = 'LOW_STOCK' and exists (
                              select 1 from ProductStock s
                              where s.product = p
                                and (:colorway is null or upper(coalesce(s.colorway, '')) = :colorway)
                                and upper(coalesce(s.sizeLabel, '')) = :sizeLabel
                                and s.quantity between 1 and 3
                          ))
                          or ((:stockFilter is null or :stockFilter = 'IN_STOCK') and exists (
                              select 1 from ProductStock s
                              where s.product = p
                                and (:colorway is null or upper(coalesce(s.colorway, '')) = :colorway)
                                and upper(coalesce(s.sizeLabel, '')) = :sizeLabel
                                and s.quantity > 0
                          ))
                      )
                  )
                  or (
                      :sizeLabel is null
                      and :stockFilter is not null
                      and (
                          (:stockFilter = 'OUT_OF_STOCK' and not exists (
                              select 1 from ProductStock s
                              where s.product = p
                                and (:colorway is null or upper(coalesce(s.colorway, '')) = :colorway)
                                and s.quantity > 0
                          ))
                          or (:stockFilter = 'LOW_STOCK' and exists (
                              select 1 from ProductStock s
                              where s.product = p
                                and (:colorway is null or upper(coalesce(s.colorway, '')) = :colorway)
                                and s.quantity between 1 and 3
                          ))
                          or (:stockFilter = 'IN_STOCK' and exists (
                              select 1 from ProductStock s
                              where s.product = p
                                and (:colorway is null or upper(coalesce(s.colorway, '')) = :colorway)
                                and s.quantity > 0
                          ))
                      )
                  )
              )
            """)
    Page<Long> findCatalogProductIds(
            @Param("brand") String brand,
            @Param("department") String department,
            @Param("category") String category,
            @Param("productType") String productType,
            @Param("colorway") String colorway,
            @Param("sizeLabel") String sizeLabel,
            @Param("stockFilter") String stockFilter,
            @Param("searchPattern") String searchPattern,
            Pageable pageable
    );

    @Query("""
            select distinct p from Product p
            left join fetch p.stocks s
            left join fetch p.colorwayImages c
            left join fetch p.colorwayDetails d
            where p.id in :ids
            """)
    List<Product> findAllByIdInWithStocks(@Param("ids") List<Long> ids);

    @Query(
            value = """
                    select b.brand
                    from (
                        select distinct trim(p.brand) as brand
                        from products p
                        where p.active = true
                          and p.brand is not null
                          and trim(p.brand) <> ''
                    ) b
                    order by lower(b.brand)
                    """,
            nativeQuery = true
    )
    List<String> findDistinctActiveBrands();

    @Query(
            value = """
                    select distinct upper(trim(p.department))
                    from products p
                    where p.active = true
                      and p.department is not null
                      and trim(p.department) <> ''
                    order by upper(trim(p.department))
                    """,
            nativeQuery = true
    )
    List<String> findDistinctActiveDepartments();

    @Query(
            value = """
                    select distinct upper(trim(p.category))
                    from products p
                    where p.active = true
                      and p.category is not null
                      and trim(p.category) <> ''
                    order by upper(trim(p.category))
                    """,
            nativeQuery = true
    )
    List<String> findDistinctActiveCategories();

    @Query(
            value = """
                    select distinct upper(trim(p.product_type))
                    from products p
                    where p.active = true
                      and p.product_type is not null
                      and trim(p.product_type) <> ''
                    order by upper(trim(p.product_type))
                    """,
            nativeQuery = true
    )
    List<String> findDistinctActiveProductTypes();

    @Query(
            value = """
                    select distinct upper(trim(ps.colorway))
                    from product_stocks ps
                    join products p on p.id = ps.product_id
                    where p.active = true
                      and ps.colorway is not null
                      and trim(ps.colorway) <> ''
                    order by upper(trim(ps.colorway))
                    """,
            nativeQuery = true
    )
    List<String> findDistinctActiveColorways();
}
