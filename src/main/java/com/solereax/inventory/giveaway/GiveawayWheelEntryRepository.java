package com.solereax.inventory.giveaway;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GiveawayWheelEntryRepository extends JpaRepository<GiveawayWheelEntry, Long> {
    List<GiveawayWheelEntry> findAllByOrderByUpdatedAtDesc();

    List<GiveawayWheelEntry> findAllByEntryCountGreaterThanOrderByUpdatedAtDesc(int entryCount);

    List<GiveawayWheelEntry> findAllByStatusOrderByUpdatedAtDesc(GiveawayWheelEntryStatus status);

    List<GiveawayWheelEntry> findTop20ByFullNameContainingIgnoreCaseOrderByUpdatedAtDesc(String fullName);

    boolean existsByFullNameIgnoreCase(String fullName);

    boolean existsByFullNameIgnoreCaseAndIdNot(String fullName, Long id);
}

