-- Migrate brand logo URLs from /uploads/brands/ to /uploads/branding/ for backward compatibility
UPDATE brands
SET logo_url = REPLACE(logo_url, '/uploads/brands/', '/uploads/branding/')
WHERE logo_url IS NOT NULL
  AND logo_url LIKE '/uploads/brands/%';

