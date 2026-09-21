package com.solereax.inventory.gamification;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface BadgeDefinitionRepository extends JpaRepository<BadgeDefinition, Long> {
    Optional<BadgeDefinition> findByCode(String code);
}

