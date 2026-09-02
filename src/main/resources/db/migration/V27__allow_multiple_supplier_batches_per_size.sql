ALTER TABLE product_stocks
    DROP CONSTRAINT IF EXISTS uq_product_size_colorway_group;

ALTER TABLE product_stocks
    ADD CONSTRAINT uq_product_size_colorway_group_supplier UNIQUE (product_id, size_label, colorway, size_group, supplier);

