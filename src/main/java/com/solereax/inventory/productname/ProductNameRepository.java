package com.solereax.inventory.productname;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductNameRepository extends JpaRepository<ProductName, Long> {
    Optional<ProductName> findByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCase(String name);
}
