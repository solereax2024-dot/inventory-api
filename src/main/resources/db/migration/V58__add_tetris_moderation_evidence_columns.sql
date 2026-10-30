ALTER TABLE app_users
    ADD COLUMN IF NOT EXISTS tetris_moderation_evidence VARCHAR(4000);

ALTER TABLE tetris_moderation_audit_log
    ADD COLUMN IF NOT EXISTS evidence_snapshot VARCHAR(4000);

