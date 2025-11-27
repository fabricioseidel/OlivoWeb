-- =============================================================================
-- SCRIPT 17: CONFIGURAR SUPABASE STORAGE PARA IMÁGENES DE PRODUCTOS
-- =============================================================================
-- Fecha: 2025-10-28
-- Propósito: Crear bucket y políticas para almacenar imágenes de productos
-- =============================================================================

-- PASO 1: Crear bucket público para imágenes de productos
-- Nota: Esto se hace desde la UI de Supabase -> Storage -> New Bucket
-- Nombre: product-images
-- Public: Yes
-- File size limit: 5MB
-- Allowed MIME types: image/jpeg, image/png, image/webp

-- PASO 2: Verificar que las columnas de imagen existan
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_name = 'products' 
  AND table_schema = 'public'
  AND column_name IN ('image_url', 'gallery', 'featured');

-- PASO 3: Si no existen, agregarlas (ya se ejecutó en Script 7)
-- ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;
-- ALTER TABLE products ADD COLUMN IF NOT EXISTS gallery JSONB;
-- ALTER TABLE products ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT FALSE;

-- PASO 4: Crear políticas RLS para el bucket (ejecutar después de crear bucket)
-- Estas políticas se configuran en Supabase UI -> Storage -> product-images -> Policies

-- Política 1: Permitir lectura pública
-- CREATE POLICY "Public Access"
-- ON storage.objects FOR SELECT
-- USING (bucket_id = 'product-images');

-- Política 2: Permitir upload autenticado
-- CREATE POLICY "Authenticated Upload"
-- ON storage.objects FOR INSERT
-- WITH CHECK (bucket_id = 'product-images' AND auth.role() = 'authenticated');

-- Política 3: Permitir delete para admins
-- CREATE POLICY "Admin Delete"
-- ON storage.objects FOR DELETE
-- USING (bucket_id = 'product-images' AND auth.role() = 'authenticated');

-- PASO 5: Verificar productos con imágenes
SELECT 
  barcode,
  name,
  image_url,
  gallery,
  featured
FROM public.products
WHERE image_url IS NOT NULL OR gallery IS NOT NULL
LIMIT 10;

-- =============================================================================
-- NOTAS:
-- =============================================================================
-- 1. Crear bucket desde UI: Storage -> New Bucket -> "product-images" (público)
-- 2. Las URLs quedarán: https://[PROJECT_ID].supabase.co/storage/v1/object/public/product-images/[filename]
-- 3. La app móvil subirá fotos con expo-file-system
-- 4. La web subirá desde formulario de productos
-- =============================================================================
