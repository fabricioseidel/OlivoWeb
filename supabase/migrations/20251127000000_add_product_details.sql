-- Add new columns to products table
ALTER TABLE products
ADD COLUMN IF NOT EXISTS measurement_unit TEXT,
ADD COLUMN IF NOT EXISTS measurement_value NUMERIC,
ADD COLUMN IF NOT EXISTS suggested_price NUMERIC,
ADD COLUMN IF NOT EXISTS offer_price NUMERIC,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false;

-- Update existing products to be inactive by default as requested
UPDATE products SET is_active = false;
