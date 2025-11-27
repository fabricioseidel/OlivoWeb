-- =============================================================================
-- SCRIPT 7: AGREGAR COLUMNAS DE IMAGEN Y CARACTERÍSTICAS A PRODUCTOS
-- =============================================================================
-- Fecha: 2025-10-28
-- Propósito: Agregar columnas necesarias para integración web-móvil
-- =============================================================================

-- =============================================================================
-- PASO 1: AGREGAR COLUMNAS DE IMAGEN
-- =============================================================================

-- Columna para URL de imagen principal
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Columna para galería de imágenes (array JSON)
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS gallery JSONB DEFAULT '[]'::jsonb;

-- =============================================================================
-- PASO 2: AGREGAR COLUMNAS DE CARACTERÍSTICAS
-- =============================================================================

-- Marcar productos como destacados
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false;

-- Umbral para reorden de inventario
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS reorder_threshold INTEGER DEFAULT 10;

-- Descripción del producto
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS description TEXT;

-- Timestamp de creación
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- =============================================================================
-- PASO 3: CREAR ÍNDICES
-- =============================================================================

-- Índice para productos destacados
CREATE INDEX IF NOT EXISTS idx_products_featured 
  ON public.products(featured) 
  WHERE featured = true;

-- Índice para productos con stock bajo
CREATE INDEX IF NOT EXISTS idx_products_reorder 
  ON public.products(stock) 
  WHERE stock <= reorder_threshold;

-- =============================================================================
-- PASO 4: AGREGAR COMENTARIOS
-- =============================================================================

COMMENT ON COLUMN public.products.image_url IS 'URL de la imagen principal del producto';
COMMENT ON COLUMN public.products.gallery IS 'Array JSON de URLs de imágenes adicionales';
COMMENT ON COLUMN public.products.featured IS 'Indica si el producto está destacado en la tienda';
COMMENT ON COLUMN public.products.reorder_threshold IS 'Nivel de stock que activa alerta de reorden';
COMMENT ON COLUMN public.products.description IS 'Descripción detallada del producto para la web';
COMMENT ON COLUMN public.products.created_at IS 'Fecha de creación del producto';

-- =============================================================================
-- VERIFICACIÓN
-- =============================================================================

-- Verificar estructura de la tabla
-- SELECT 
--   column_name, 
--   data_type, 
--   is_nullable,
--   column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'public' 
--   AND table_name = 'products'
-- ORDER BY ordinal_position;

-- Verificar índices
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE schemaname = 'public' 
--   AND tablename = 'products';

