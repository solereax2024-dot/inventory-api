-- Demo products for checking brand-specific size guides and reservation flows locally.
-- These rows are intentionally separate from the real catalog and use high IDs to avoid collisions.

INSERT INTO brands (name) VALUES
  ('Nike'),
  ('On'),
  ('Onitsuka Tiger'),
  ('Adidas'),
  ('New Balance'),
  ('Puma'),
  ('Crocs')
ON CONFLICT (name) DO NOTHING;

INSERT INTO product_names (name) VALUES
  ('Air Zoom Pegasus 41 Demo'),
  ('Cloudmonster 2 Demo'),
  ('Mexico 66 Demo - Men'),
  ('Mexico 66 Demo - Women'),
  ('Ultraboost 5 Demo'),
  ('990v6 Demo'),
  ('Suede Classic Demo'),
  ('Classic Clog Demo')
ON CONFLICT (name) DO NOTHING;

INSERT INTO products (id, name, brand, description, main_color, department, category, product_type, image_url) VALUES
  (91001, 'Air Zoom Pegasus 41 Demo', 'Nike', 'Sample Nike unisex pair for checking the Nike size guide in the reservation and admin stock pages.', 'WHITE/BLACK', 'UNISEX', 'FOOTWEAR', 'RUNNING_SHOES', 'https://placehold.co/1200x900/png?text=Nike+Demo'),
  (91002, 'Cloudmonster 2 Demo', 'On', 'Sample On pair for checking the On size guide with unisex sizing.', 'WHITE/ICE', 'UNISEX', 'FOOTWEAR', 'RUNNING_SHOES', 'https://placehold.co/1200x900/png?text=On+Demo'),
  (91003, 'Mexico 66 Demo - Men', 'Onitsuka Tiger', 'Sample Onitsuka Tiger men''s pair for checking the men''s size guide section.', 'BLACK/YELLOW', 'MEN', 'FOOTWEAR', 'LIFESTYLE_SNEAKERS', 'https://placehold.co/1200x900/png?text=Onitsuka+Men+Demo'),
  (91004, 'Mexico 66 Demo - Women', 'Onitsuka Tiger', 'Sample Onitsuka Tiger women''s pair for checking the women''s size guide section.', 'CREAM/RED', 'WOMEN', 'FOOTWEAR', 'LIFESTYLE_SNEAKERS', 'https://placehold.co/1200x900/png?text=Onitsuka+Women+Demo'),
  (91005, 'Ultraboost 5 Demo', 'Adidas', 'Sample Adidas pair for checking the Adidas conversion table.', 'CORE BLACK', 'UNISEX', 'FOOTWEAR', 'RUNNING_SHOES', 'https://placehold.co/1200x900/png?text=Adidas+Demo'),
  (91006, '990v6 Demo', 'New Balance', 'Sample New Balance pair for checking the New Balance conversion table.', 'GREY', 'UNISEX', 'FOOTWEAR', 'LIFESTYLE_SNEAKERS', 'https://placehold.co/1200x900/png?text=New+Balance+Demo'),
  (91007, 'Suede Classic Demo', 'Puma', 'Sample Puma pair for checking the Puma conversion table.', 'NAVY/WHITE', 'UNISEX', 'FOOTWEAR', 'CASUAL_SNEAKERS', 'https://placehold.co/1200x900/png?text=Puma+Demo'),
  (91008, 'Classic Clog Demo', 'Crocs', 'Sample Crocs pair for checking the whole-size Crocs chart.', 'BONE', 'UNISEX', 'FOOTWEAR', 'CLOGS', 'https://placehold.co/1200x900/png?text=Crocs+Demo')
ON CONFLICT (id) DO NOTHING;

INSERT INTO product_colorway_details (product_id, colorway, description, department, category, product_type) VALUES
  (91001, 'WHITE/BLACK', 'Sample Nike unisex pair for checking the Nike size guide in the reservation and admin stock pages.', 'UNISEX', 'FOOTWEAR', 'RUNNING_SHOES'),
  (91002, 'WHITE/ICE', 'Sample On pair for checking the On size guide with unisex sizing.', 'UNISEX', 'FOOTWEAR', 'RUNNING_SHOES'),
  (91003, 'BLACK/YELLOW', 'Sample Onitsuka Tiger men''s pair for checking the men''s size guide section.', 'MEN', 'FOOTWEAR', 'LIFESTYLE_SNEAKERS'),
  (91004, 'CREAM/RED', 'Sample Onitsuka Tiger women''s pair for checking the women''s size guide section.', 'WOMEN', 'FOOTWEAR', 'LIFESTYLE_SNEAKERS'),
  (91005, 'CORE BLACK', 'Sample Adidas pair for checking the Adidas conversion table.', 'UNISEX', 'FOOTWEAR', 'RUNNING_SHOES'),
  (91006, 'GREY', 'Sample New Balance pair for checking the New Balance conversion table.', 'UNISEX', 'FOOTWEAR', 'LIFESTYLE_SNEAKERS'),
  (91007, 'NAVY/WHITE', 'Sample Puma pair for checking the Puma conversion table.', 'UNISEX', 'FOOTWEAR', 'CASUAL_SNEAKERS'),
  (91008, 'BONE', 'Sample Crocs pair for checking the whole-size Crocs chart.', 'UNISEX', 'FOOTWEAR', 'CLOGS')
ON CONFLICT (product_id, colorway) DO NOTHING;

INSERT INTO product_colorway_images (product_id, colorway, image_url) VALUES
  (91001, 'WHITE/BLACK', 'https://placehold.co/1200x900/png?text=Nike+Demo'),
  (91002, 'WHITE/ICE', 'https://placehold.co/1200x900/png?text=On+Demo'),
  (91003, 'BLACK/YELLOW', 'https://placehold.co/1200x900/png?text=Onitsuka+Men+Demo'),
  (91004, 'CREAM/RED', 'https://placehold.co/1200x900/png?text=Onitsuka+Women+Demo'),
  (91005, 'CORE BLACK', 'https://placehold.co/1200x900/png?text=Adidas+Demo'),
  (91006, 'GREY', 'https://placehold.co/1200x900/png?text=New+Balance+Demo'),
  (91007, 'NAVY/WHITE', 'https://placehold.co/1200x900/png?text=Puma+Demo'),
  (91008, 'BONE', 'https://placehold.co/1200x900/png?text=Crocs+Demo')
ON CONFLICT (product_id, colorway) DO NOTHING;

-- Unisex Nike demo stock: both men and women groups so the reservation page can switch views.
INSERT INTO product_stocks (product_id, size_label, colorway, size_group, quantity) VALUES
  (91001, '3.5', 'WHITE/BLACK', 'MEN', 2),
  (91001, '6.5', 'WHITE/BLACK', 'MEN', 4),
  (91001, '9.5', 'WHITE/BLACK', 'MEN', 1),
  (91001, '5', 'WHITE/BLACK', 'WOMEN', 1),
  (91001, '8', 'WHITE/BLACK', 'WOMEN', 3),
  (91001, '11', 'WHITE/BLACK', 'WOMEN', 2)
ON CONFLICT (product_id, size_label, colorway, size_group) DO NOTHING;

-- On demo stock: both tabs on a unisex guide.
INSERT INTO product_stocks (product_id, size_label, colorway, size_group, quantity) VALUES
  (91002, '3.5', 'WHITE/ICE', 'MEN', 2),
  (91002, '5.5', 'WHITE/ICE', 'MEN', 3),
  (91002, '7.5', 'WHITE/ICE', 'MEN', 1),
  (91002, '5', 'WHITE/ICE', 'WOMEN', 1),
  (91002, '7', 'WHITE/ICE', 'WOMEN', 2),
  (91002, '9', 'WHITE/ICE', 'WOMEN', 2)
ON CONFLICT (product_id, size_label, colorway, size_group) DO NOTHING;

-- Onitsuka men demo stock.
INSERT INTO product_stocks (product_id, size_label, colorway, size_group, quantity) VALUES
  (91003, '4', 'BLACK/YELLOW', 'STANDARD', 2),
  (91003, '6', 'BLACK/YELLOW', 'STANDARD', 3),
  (91003, '8', 'BLACK/YELLOW', 'STANDARD', 1)
ON CONFLICT (product_id, size_label, colorway, size_group) DO NOTHING;

-- Onitsuka women demo stock.
INSERT INTO product_stocks (product_id, size_label, colorway, size_group, quantity) VALUES
  (91004, '5.5', 'CREAM/RED', 'STANDARD', 2),
  (91004, '7.5', 'CREAM/RED', 'STANDARD', 3),
  (91004, '9.5', 'CREAM/RED', 'STANDARD', 1)
ON CONFLICT (product_id, size_label, colorway, size_group) DO NOTHING;

-- Adidas demo stock.
INSERT INTO product_stocks (product_id, size_label, colorway, size_group, quantity) VALUES
  (91005, '4', 'CORE BLACK', 'MEN', 2),
  (91005, '6.5', 'CORE BLACK', 'MEN', 3),
  (91005, '8.5', 'CORE BLACK', 'MEN', 1)
ON CONFLICT (product_id, size_label, colorway, size_group) DO NOTHING;

-- New Balance demo stock.
INSERT INTO product_stocks (product_id, size_label, colorway, size_group, quantity) VALUES
  (91006, '6', 'GREY', 'MEN', 2),
  (91006, '7.5', 'GREY', 'MEN', 3),
  (91006, '9', 'GREY', 'MEN', 1)
ON CONFLICT (product_id, size_label, colorway, size_group) DO NOTHING;

-- Puma demo stock.
INSERT INTO product_stocks (product_id, size_label, colorway, size_group, quantity) VALUES
  (91007, '4.5', 'NAVY/WHITE', 'MEN', 2),
  (91007, '6.5', 'NAVY/WHITE', 'MEN', 3),
  (91007, '8.5', 'NAVY/WHITE', 'MEN', 1)
ON CONFLICT (product_id, size_label, colorway, size_group) DO NOTHING;

-- Crocs demo stock.
INSERT INTO product_stocks (product_id, size_label, colorway, size_group, quantity) VALUES
  (91008, '2', 'BONE', 'MEN', 2),
  (91008, '4', 'BONE', 'MEN', 3),
  (91008, '6', 'BONE', 'MEN', 1),
  (91008, '4', 'BONE', 'WOMEN', 2),
  (91008, '6', 'BONE', 'WOMEN', 2),
  (91008, '8', 'BONE', 'WOMEN', 1)
ON CONFLICT (product_id, size_label, colorway, size_group) DO NOTHING;

SELECT setval(
  pg_get_serial_sequence('products', 'id'),
  GREATEST((SELECT COALESCE(MAX(id), 1) FROM products), 1),
  true
);

