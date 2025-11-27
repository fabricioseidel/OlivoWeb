-- Agregar columnas faltantes a la tabla products
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS features JSONB; -- Usamos JSONB para guardar el array de características

-- Agregar columnas faltantes a la tabla suppliers
ALTER TABLE suppliers 
ADD COLUMN IF NOT EXISTS dispatch_days TEXT,
ADD COLUMN IF NOT EXISTS payment_type TEXT;

-- Actualizar la caché del esquema (esto suele ser automático, pero por si acaso)
NOTIFY pgrst, 'reload config';
