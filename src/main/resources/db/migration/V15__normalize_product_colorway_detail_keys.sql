DELETE FROM product_colorway_details
WHERE id IN (
    SELECT id
    FROM (
        SELECT
            id,
            ROW_NUMBER() OVER (
                PARTITION BY product_id, UPPER(TRIM(colorway))
                ORDER BY updated_at DESC, id DESC
            ) AS rn
        FROM product_colorway_details
    ) ranked
    WHERE rn > 1
);

UPDATE product_colorway_details
SET colorway = UPPER(TRIM(colorway))
WHERE colorway IS NOT NULL;

