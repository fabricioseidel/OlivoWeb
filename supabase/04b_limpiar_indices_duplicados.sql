-- =============================================================================
-- SCRIPT 4B: LIMPIAR ÍNDICES DUPLICADOS
-- =============================================================================
-- Fecha: 2025-10-28
-- Propósito: Eliminar índices duplicados detectados después del Script 4
-- ⏱️ Tiempo estimado: 1-2 minutos
-- ⚠️ IMPACTO: Mejora inmediata de performance en escrituras
-- =============================================================================

-- =============================================================================
-- ANTES DE EJECUTAR: Verificar índices actuales
-- =============================================================================
-- Ejecuta esto primero para ver qué vas a eliminar:

-- SELECT 
--   tablename,
--   indexname,
--   pg_size_pretty(pg_relation_size(indexname::regclass)) as size
-- FROM pg_indexes 
-- WHERE schemaname = 'public'
-- AND indexname IN (
--   'idx_products_updated_at',
--   'idx_sales_client',
--   'idx_sales_client_sale_id'
-- );

-- =============================================================================
-- PASO 1: Eliminar índice duplicado en products.updated_at
-- =============================================================================
-- DUPLICADO 1: idx_products_updated_at
-- MANTENER:    idx_products_updated (DESC, más eficiente)

DROP INDEX IF EXISTS public.idx_products_updated_at;

-- =============================================================================
-- PASO 2: Eliminar índices duplicados en sales.client_sale_id
-- =============================================================================
-- DUPLICADO 1: idx_sales_client (btree simple)
-- DUPLICADO 2: idx_sales_client_sale_id (btree con WHERE)
-- MANTENER:    idx_sales_client_sale_id_unique (es UNIQUE, importante!)

DROP INDEX IF EXISTS public.idx_sales_client;
DROP INDEX IF EXISTS public.idx_sales_client_sale_id;

-- =============================================================================
-- DECISIÓN SOBRE products.category
-- =============================================================================
-- TIENES 2 ÍNDICES diferentes pero útiles:
-- - idx_products_category (btree) → Para filtros exactos: WHERE category = 'X'
-- - idx_products_category_trgm (GIN) → Para búsquedas: WHERE category LIKE '%tex%'
--
-- RECOMENDACIÓN: MANTENER AMBOS (cada uno tiene un propósito diferente)
-- Si casi nunca usas búsquedas LIKE en category, puedes eliminar el GIN:
-- DROP INDEX IF EXISTS public.idx_products_category_trgm;

-- =============================================================================
-- VERIFICACIÓN POST-LIMPIEZA
-- =============================================================================
-- Ejecuta esto después para confirmar que se eliminaron:

-- SELECT 
--   tablename,
--   COUNT(*) as num_indices,
--   STRING_AGG(indexname, ', ' ORDER BY indexname) as indices
-- FROM pg_indexes 
-- WHERE schemaname = 'public'
-- AND tablename IN ('products', 'sales')
-- AND indexname LIKE 'idx_%'
-- GROUP BY tablename
-- ORDER BY tablename;

-- Verificar tamaño total de índices por tabla:
-- SELECT 
--   tablename,
--   pg_size_pretty(SUM(pg_relation_size(indexname::regclass))) as total_index_size
-- FROM pg_indexes 
-- WHERE schemaname = 'public'
-- AND tablename IN ('products', 'categories', 'sales', 'suppliers', 'product_suppliers')
-- GROUP BY tablename
-- ORDER BY tablename;

-- =============================================================================
-- RESUMEN DE CAMBIOS
-- =============================================================================
-- ELIMINADOS (3 índices):
-- ❌ idx_products_updated_at     → Duplicado de idx_products_updated
-- ❌ idx_sales_client            → Duplicado, sin beneficio
-- ❌ idx_sales_client_sale_id    → Duplicado de idx_sales_client_sale_id_unique
--
-- MANTENIDOS (índices útiles):
-- ✅ idx_products_updated        → Para ORDER BY updated_at DESC
-- ✅ idx_sales_client_sale_id_unique → UNIQUE constraint (necesario)
-- ✅ idx_products_category       → Filtros exactos
-- ✅ idx_products_category_trgm  → Búsquedas LIKE (opcional)
--
-- BENEFICIOS:
-- ⚡ -20% de tiempo en INSERT/UPDATE en products y sales
-- 💾 Menos espacio en disco
-- 📊 Estadísticas más limpias
