-- Speed up public catalog filters and paging lookups.
create index if not exists idx_products_active_brand_name
    on products (lower(coalesce(brand, '')), lower(coalesce(name, '')), id)
    where active = true;

create index if not exists idx_products_active_department
    on products (upper(coalesce(department, '')))
    where active = true;

create index if not exists idx_products_active_category
    on products (upper(coalesce(category, '')))
    where active = true;

create index if not exists idx_products_active_product_type
    on products (upper(coalesce(product_type, '')))
    where active = true;

create index if not exists idx_products_active_name
    on products (lower(coalesce(name, '')))
    where active = true;

create index if not exists idx_product_stocks_catalog_colorway_size_qty
    on product_stocks (product_id, upper(coalesce(colorway, '')), upper(coalesce(size_label, '')), quantity);

create index if not exists idx_product_stocks_catalog_colorway_qty
    on product_stocks (product_id, upper(coalesce(colorway, '')), quantity);

