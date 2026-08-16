DO $$
DECLARE
    fk_name TEXT;
BEGIN
    SELECT tc.constraint_name
      INTO fk_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
       AND tc.table_schema = kcu.table_schema
     WHERE tc.constraint_type = 'FOREIGN KEY'
       AND tc.table_name = 'customer_order_items'
       AND kcu.column_name = 'product_id'
     LIMIT 1;

    IF fk_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE customer_order_items DROP CONSTRAINT %I', fk_name);
    END IF;

    ALTER TABLE customer_order_items
        ADD CONSTRAINT fk_customer_order_items_product
        FOREIGN KEY (product_id)
        REFERENCES products(id)
        ON DELETE CASCADE;
END $$;

