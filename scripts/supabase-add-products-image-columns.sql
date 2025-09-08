-- Run this in Supabase SQL editor
-- Adds image_url (TEXT) and gallery (JSONB) to products table if missing
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS gallery JSONB;

-- Optional: comments
COMMENT ON COLUMN products.image_url IS 'Public URL to main image in Storage (uploads bucket)';
COMMENT ON COLUMN products.gallery IS 'Array of image URLs for product gallery';
