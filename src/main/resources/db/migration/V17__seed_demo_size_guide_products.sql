-- Demo catalog seed data is no longer part of the mandatory Flyway migration chain.
-- This migration is intentionally a no-op so newly created production databases do not
-- receive demo products by default. Use the opt-in application seeder instead.
SELECT 1;

