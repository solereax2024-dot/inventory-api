ALTER TABLE products
ADD COLUMN department VARCHAR(30);

ALTER TABLE products
ADD COLUMN category VARCHAR(30);

ALTER TABLE products
ADD COLUMN product_type VARCHAR(50);

UPDATE products
SET department = 'UNISEX'
WHERE department IS NULL OR TRIM(department) = '';

UPDATE products
SET category = 'FOOTWEAR'
WHERE category IS NULL OR TRIM(category) = '';

UPDATE products
SET product_type = 'LIFESTYLE_SNEAKERS'
WHERE product_type IS NULL OR TRIM(product_type) = '';
