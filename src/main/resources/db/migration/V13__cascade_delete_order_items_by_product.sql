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
       AND tc.table_schema = current_schema()
       AND tc.table_name = 'customer_order_items'
       AND kcu.column_name = 'product_id'
     LIMIT 1;

    IF fk_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE %I.%I DROP CONSTRAINT %I', current_schema(), 'customer_order_items', fk_name);
    END IF;

    EXECUTE format(
        'ALTER TABLE %I.%I ADD CONSTRAINT %I FOREIGN KEY (product_id) REFERENCES %I.%I(id) ON DELETE CASCADE',
        current_schema(),
        'customer_order_items',
        'fk_customer_order_items_product',
        current_schema(),
        'products'
    );
END $$;

