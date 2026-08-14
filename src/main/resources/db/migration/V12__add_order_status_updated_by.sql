ALTER TABLE customer_orders
ADD COLUMN IF NOT EXISTS status_updated_by VARCHAR(120);

UPDATE customer_orders
SET status_updated_by = 'system'
WHERE status_updated_by IS NULL OR btrim(status_updated_by) = '';

ALTER TABLE customer_orders
ALTER COLUMN status_updated_by SET NOT NULL;
