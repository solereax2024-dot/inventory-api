ALTER TABLE product_colorway_details
    ADD COLUMN price NUMERIC(12,2);

ALTER TABLE product_stocks
    ADD COLUMN price NUMERIC(12,2);

UPDATE product_colorway_details pcd
SET price = p.price
FROM products p
WHERE pcd.product_id = p.id
  AND p.price IS NOT NULL
  AND pcd.price IS NULL;

UPDATE product_stocks ps
SET price = pcd.price
FROM product_colorway_details pcd
WHERE ps.product_id = pcd.product_id
  AND UPPER(TRIM(ps.colorway)) = UPPER(TRIM(pcd.colorway))
  AND pcd.price IS NOT NULL
  AND ps.price IS NULL;

UPDATE product_stocks ps
SET price = p.price
FROM products p
WHERE ps.product_id = p.id
  AND p.price IS NOT NULL
  AND ps.price IS NULL;

