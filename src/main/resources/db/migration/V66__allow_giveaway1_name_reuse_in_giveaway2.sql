DROP INDEX IF EXISTS idx_giveaway_wheel_entries_full_name_unique_ci;

CREATE UNIQUE INDEX IF NOT EXISTS idx_giveaway_wheel_entries_full_name_unique_ci
    ON giveaway_wheel_entries ((LOWER(TRIM(full_name))))
    WHERE source_tag IS NULL OR UPPER(TRIM(source_tag)) <> 'GIVEAWAY_1';

