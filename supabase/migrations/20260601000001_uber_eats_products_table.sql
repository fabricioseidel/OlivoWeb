-- =============================================
-- TABLA PARA PRODUCTOS UBER EATS
-- Ejecutar este SQL en Supabase SQL Editor
-- =============================================

-- Eliminar tabla si existe (para recrear con nuevos tipos)
DROP TABLE IF EXISTS uber_eats_products CASCADE;

-- Crear tabla para productos Uber Eats
CREATE TABLE uber_eats_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barcode TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    original_category TEXT,
    uber_category TEXT,
    uber_categories TEXT[], -- Array de categorías múltiples
    price NUMERIC NOT NULL DEFAULT 0, -- Sin límite de precisión
    price_with_vat NUMERIC DEFAULT 0,
    vat_percentage NUMERIC DEFAULT 19.0,
    description TEXT,
    image_url TEXT,
    product_type TEXT, -- 'Alcohol', 'Tobacco', 'Vapes', ''
    hfss_item TEXT, -- 'HFSS Food', 'HFSS Drink', ''
    alcohol_units NUMERIC,
    quantity_restriction INTEGER,
    in_stock BOOLEAN DEFAULT true,
    measurement_unit TEXT DEFAULT 'un',
    measurement_value NUMERIC DEFAULT 1,
    is_valid BOOLEAN DEFAULT true,
    validation_errors TEXT[],
    modified BOOLEAN DEFAULT false,
    excluded BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para búsqueda eficiente
CREATE INDEX IF NOT EXISTS idx_uber_eats_products_barcode ON uber_eats_products(barcode);
CREATE INDEX IF NOT EXISTS idx_uber_eats_products_category ON uber_eats_products(uber_category);
CREATE INDEX IF NOT EXISTS idx_uber_eats_products_excluded ON uber_eats_products(excluded);
CREATE INDEX IF NOT EXISTS idx_uber_eats_products_in_stock ON uber_eats_products(in_stock);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_uber_eats_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_uber_eats_products_updated_at ON uber_eats_products;
CREATE TRIGGER trigger_update_uber_eats_products_updated_at
    BEFORE UPDATE ON uber_eats_products
    FOR EACH ROW
    EXECUTE FUNCTION update_uber_eats_products_updated_at();

-- Habilitar RLS (Row Level Security)
ALTER TABLE uber_eats_products ENABLE ROW LEVEL SECURITY;

-- Política para permitir lectura a usuarios autenticados
CREATE POLICY "Allow authenticated read uber_eats_products"
    ON uber_eats_products
    FOR SELECT
    TO authenticated
    USING (true);

-- Política para permitir insert/update/delete a usuarios autenticados
CREATE POLICY "Allow authenticated write uber_eats_products"
    ON uber_eats_products
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Política para service role (admin)
CREATE POLICY "Allow service role full access uber_eats_products"
    ON uber_eats_products
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Función para sincronizar desde la tabla products principal
CREATE OR REPLACE FUNCTION sync_uber_eats_from_products()
RETURNS INTEGER AS $$
DECLARE
    synced_count INTEGER := 0;
BEGIN
    -- Insertar nuevos productos o actualizar existentes
    INSERT INTO uber_eats_products (
        barcode,
        name,
        original_category,
        uber_category,
        price,
        price_with_vat,
        description,
        image_url,
        in_stock,
        measurement_unit,
        measurement_value
    )
    SELECT 
        p.barcode,
        COALESCE(p.name, 'Sin nombre'),
        p.category,
        p.category, -- Por defecto, usar la misma categoría
        COALESCE(p.sale_price, 0)::NUMERIC,
        COALESCE(p.sale_price, 0)::NUMERIC, -- Asumiendo que ya incluye IVA
        p.description,
        p.image_url,
        COALESCE(p.stock, 0) > 0,
        COALESCE(NULLIF(p.measurement_unit, ''), 'un'),
        COALESCE(p.measurement_value, 1)::NUMERIC
    FROM products p
    WHERE p.barcode IS NOT NULL AND p.barcode != ''
    ON CONFLICT (barcode) DO UPDATE SET
        name = EXCLUDED.name,
        original_category = EXCLUDED.original_category,
        price = EXCLUDED.price,
        price_with_vat = EXCLUDED.price_with_vat,
        description = EXCLUDED.description,
        image_url = COALESCE(EXCLUDED.image_url, uber_eats_products.image_url),
        in_stock = EXCLUDED.in_stock,
        measurement_unit = EXCLUDED.measurement_unit,
        measurement_value = EXCLUDED.measurement_value,
        updated_at = NOW();
    
    GET DIAGNOSTICS synced_count = ROW_COUNT;
    RETURN synced_count;
END;
$$ LANGUAGE plpgsql;

-- Ejecutar sincronización inicial (opcional)
-- SELECT sync_uber_eats_from_products();

COMMENT ON TABLE uber_eats_products IS 'Productos preparados para exportación a Uber Eats Grocery';
COMMENT ON COLUMN uber_eats_products.uber_categories IS 'Array de categorías múltiples para Uber Eats';
COMMENT ON COLUMN uber_eats_products.product_type IS 'Tipo de producto: Alcohol, Tobacco, Vapes, o vacío';
COMMENT ON COLUMN uber_eats_products.hfss_item IS 'HFSS: High Fat Sugar Salt - HFSS Food o HFSS Drink';
