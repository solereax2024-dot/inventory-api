package com.solereax.inventory.giveaway;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface GiveawayWheelEntryRepository extends JpaRepository<GiveawayWheelEntry, Long> {
    List<GiveawayWheelEntry> findAllByOrderByUpdatedAtDesc();

    List<GiveawayWheelEntry> findAllByEntryCountGreaterThanOrderByUpdatedAtDesc(int entryCount);

    List<GiveawayWheelEntry> findAllByEntryCountGreaterThanAndExcludedFromWheelFalseOrderByWheelDisplayOrderAscUpdatedAtDesc(int entryCount);

    List<GiveawayWheelEntry> findAllByStatusOrderByUpdatedAtDesc(GiveawayWheelEntryStatus status);

    List<GiveawayWheelEntry> findAllByFullNameIgnoreCase(String fullName);

    List<GiveawayWheelEntry> findTop20ByFullNameContainingIgnoreCaseOrderByUpdatedAtDesc(String fullName);

    boolean existsByFullNameIgnoreCase(String fullName);

    boolean existsByFullNameIgnoreCaseAndIdNot(String fullName, Long id);

    @Query("""
            select case when count(entry) > 0 then true else false end
            from GiveawayWheelEntry entry
            where lower(trim(entry.fullName)) = lower(trim(:fullName))
              and (:currentEntryId is null or entry.id <> :currentEntryId)
              and (entry.sourceTag is null or upper(trim(entry.sourceTag)) <> 'GIVEAWAY_1')
            """)
    boolean existsRegularEntryNameConflict(@Param("fullName") String fullName, @Param("currentEntryId") Long currentEntryId);

    long deleteAllByIdIsNotNull();
}

