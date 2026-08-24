package com.solereax.inventory.inventory;

import org.springframework.data.jpa.repository.JpaRepository;

public interface SiteViewSessionRepository extends JpaRepository<SiteViewSession, Long> {
    boolean existsBySessionId(String sessionId);
}

