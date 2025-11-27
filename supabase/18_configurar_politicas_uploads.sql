-- =============================================================================
-- SCRIPT 18: CONFIGURAR POLÍTICAS PARA BUCKET UPLOADS
-- =============================================================================
-- Fecha: 2025-10-29
-- Propósito: Configurar políticas RLS para el bucket 'uploads' existente
-- =============================================================================

-- PASO 1: Crear políticas para bucket 'uploads'
-- -----------------------------------------------------------------------------

-- Eliminar políticas existentes si hay conflicto
DROP POLICY IF EXISTS "Public read access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update" ON storage.objects;
DROP POLICY IF EXISTS "Service role can delete" ON storage.objects;

-- Política 1: Lectura pública (para que la web pueda mostrar imágenes)
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'uploads');

-- Política 2: Upload para usuarios autenticados
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'uploads');

-- Política 3: Update para usuarios autenticados
CREATE POLICY "Authenticated users can update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'uploads');

-- Política 4: Delete solo con service_role (admin)
CREATE POLICY "Service role can delete"
ON storage.objects FOR DELETE
TO service_role
USING (bucket_id = 'uploads');

-- PASO 2: Limpiar rutas locales inválidas
-- -----------------------------------------------------------------------------
-- Actualizar productos que tengan rutas locales /uploads/ a NULL
UPDATE public.products
SET image_url = NULL
WHERE image_url LIKE '/uploads/%' 
  AND image_url NOT LIKE 'https://%';

-- Verificar cuántos se actualizaron
SELECT COUNT(*) AS productos_con_ruta_local_removida
FROM public.products
WHERE image_url IS NULL;

-- PASO 3: Verificar productos con imágenes válidas
-- -----------------------------------------------------------------------------
SELECT 
  COUNT(*) AS total_productos,
  COUNT(image_url) AS con_imagen,
  COUNT(*) - COUNT(image_url) AS sin_imagen
FROM public.products;

-- Ver algunos productos con imágenes válidas
SELECT barcode, name, image_url
FROM public.products
WHERE image_url LIKE 'https://%'
LIMIT 10;

-- =============================================================================
-- RESUMEN DE CONFIGURACIÓN:
-- =============================================================================
-- ✅ Bucket: 'uploads' (ya existente)
-- ✅ Público para lectura
-- ✅ Solo usuarios autenticados pueden subir/modificar
-- ✅ Solo service_role puede eliminar
-- ✅ URLs válidas: https://nuuoooqfbuwodagvmmsf.supabase.co/storage/v1/object/public/uploads/...
-- =============================================================================
