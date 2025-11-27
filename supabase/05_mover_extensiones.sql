-- =============================================================================
-- SCRIPT 5: MOVER EXTENSIONES A SCHEMA DEDICADO
-- =============================================================================
-- Fecha: 2025-10-28
-- Propósito: Mover extensiones pg_trgm y citext del schema public a extensions
-- IMPORTANTE: Esto mejora la organización y seguridad del esquema
-- =============================================================================

-- =============================================================================
-- PASO 1: CREAR SCHEMA extensions SI NO EXISTE
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS extensions;

-- Dar permisos de uso al schema extensions
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- =============================================================================
-- PASO 2: MOVER EXTENSIONES A SCHEMA extensions
-- =============================================================================

-- Mover extensión pg_trgm (para búsquedas de similitud de texto)
ALTER EXTENSION pg_trgm SET SCHEMA extensions;

-- Mover extensión citext (para columnas de texto case-insensitive)
ALTER EXTENSION citext SET SCHEMA extensions;

-- =============================================================================
-- PASO 3: ACTUALIZAR search_path PARA INCLUIR extensions
-- =============================================================================

-- Para la base de datos completa
ALTER DATABASE postgres SET search_path TO public, extensions;

-- Para el rol postgres
ALTER ROLE postgres SET search_path TO public, extensions;

-- Para el rol authenticated (usuarios de la app)
ALTER ROLE authenticated SET search_path TO public, extensions;

-- Para el rol anon (usuarios anónimos)
ALTER ROLE anon SET search_path TO public, extensions;

-- Para el rol service_role (operaciones de servicio)
ALTER ROLE service_role SET search_path TO public, extensions;

-- =============================================================================
-- PASO 4: RECREAR ÍNDICES QUE USEN pg_trgm (si existen)
-- =============================================================================

-- Si tienes índices GIN/GIST que usan pg_trgm para búsquedas, puede que necesites recrearlos
-- Ejemplo (ajusta según tus índices reales):

-- DROP INDEX IF EXISTS public.idx_products_name_trgm;
-- CREATE INDEX idx_products_name_trgm 
--   ON public.products 
--   USING gin (name extensions.gin_trgm_ops);

-- DROP INDEX IF EXISTS public.idx_products_search_text;
-- CREATE INDEX idx_products_search_text 
--   ON public.products 
--   USING gin (
--     (COALESCE(name, '') || ' ' || COALESCE(category, '')) extensions.gin_trgm_ops
--   );

-- =============================================================================
-- PASO 5: ACTUALIZAR COLUMNAS citext (si existen)
-- =============================================================================

-- Si tienes columnas de tipo citext, NO necesitas cambiar nada
-- El tipo citext seguirá funcionando automáticamente desde el schema extensions

-- Ejemplo de cómo verificar columnas citext:
-- SELECT 
--   table_name, 
--   column_name, 
--   data_type 
-- FROM information_schema.columns 
-- WHERE data_type = 'USER-DEFINED' 
--   AND udt_name = 'citext';

-- =============================================================================
-- VERIFICACIÓN
-- =============================================================================

-- Verificar ubicación de las extensiones:
-- SELECT 
--   e.extname AS extension_name,
--   n.nspname AS schema_name,
--   e.extversion AS version
-- FROM pg_extension e
-- JOIN pg_namespace n ON e.extnamespace = n.oid
-- WHERE e.extname IN ('pg_trgm', 'citext')
-- ORDER BY e.extname;

-- Verificar search_path configurado:
-- SHOW search_path;

-- Verificar search_path por rol:
-- SELECT 
--   rolname,
--   rolconfig
-- FROM pg_roles
-- WHERE rolname IN ('postgres', 'authenticated', 'anon', 'service_role');

-- =============================================================================
-- NOTAS ADICIONALES
-- =============================================================================
-- 
-- 1. EXTENSIONES QUE SE MOVIERON:
--    - pg_trgm: Funciones para búsqueda de similitud de texto (LIKE '%texto%')
--    - citext: Tipo de dato para texto case-insensitive
--
-- 2. BENEFICIOS:
--    - Mejor organización del esquema
--    - Separación de extensiones del esquema público
--    - Facilita backups y migraciones
--    - Mejora la seguridad
--
-- 3. COMPATIBILIDAD:
--    - Este cambio es retrocompatible
--    - Las consultas existentes seguirán funcionando
--    - Los tipos y funciones se encontrarán automáticamente vía search_path
--
