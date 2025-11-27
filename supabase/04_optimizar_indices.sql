-- =============================================================================
-- SCRIPT 4: OPTIMIZAR ÍNDICES - ELIMINAR DUPLICADOS Y CREAR NECESARIOS
-- =============================================================================
-- Fecha: 2025-10-28
-- Propósito: Eliminar índices duplicados/no usados y crear índices para foreign keys
-- =============================================================================

-- =============================================================================
-- PASO 1: IDENTIFICAR Y ELIMINAR ÍNDICES DUPLICADOS
-- =============================================================================
-- IMPORTANTE: Ejecuta primero la consulta de verificación (comentada abajo)
-- para identificar qué índices son duplicados antes de eliminar

-- CONSULTA DE VERIFICACIÓN (ejecutar antes de eliminar):
-- SELECT 
--   t.relname AS table_name,
--   i.relname AS index_name,
--   array_to_string(array_agg(a.attname), ', ') AS column_names,
--   pg_size_pretty(pg_relation_size(i.oid)) AS index_size
-- FROM pg_class t
-- JOIN pg_index ix ON t.oid = ix.indrelid
-- JOIN pg_class i ON i.oid = ix.indexrelid
-- JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
-- WHERE t.relkind = 'r'
-- AND t.relname IN ('products', 'categories', 'sales', 'sale_items', 'suppliers', 'product_suppliers')
-- GROUP BY t.relname, i.relname, i.oid, ix.indkey
-- ORDER BY t.relname, column_names;

-- =============================================================================
-- EJEMPLO: Eliminar índices duplicados (ajusta según tu caso)
-- =============================================================================
-- Si tienes múltiples índices en la misma columna, elimina los duplicados:

-- DROP INDEX IF EXISTS public.idx_products_barcode_duplicate;
-- DROP INDEX IF EXISTS public.idx_categories_name_duplicate;

-- =============================================================================
-- PASO 2: CREAR ÍNDICES PARA FOREIGN KEYS EN sale_items
-- =============================================================================
-- Estos índices mejorarán significativamente el rendimiento de consultas con JOINs

-- NOTA: La tabla sale_items probablemente NO existe en tu proyecto actual
-- porque las ventas se guardan con items en JSONB (columna items_json en sales)
-- Por lo tanto, SALTAMOS la creación de esta tabla y sus índices

-- Si en el futuro necesitas normalizar los items de venta:
-- CREATE TABLE IF NOT EXISTS public.sale_items (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
--   product_barcode TEXT NOT NULL REFERENCES public.products(barcode) ON DELETE RESTRICT,
--   quantity INTEGER NOT NULL DEFAULT 1,
--   unit_price NUMERIC NOT NULL DEFAULT 0,
--   subtotal NUMERIC NOT NULL DEFAULT 0,
--   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
-- );

-- Índices para sale_items (comentados porque la tabla no existe)
-- CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id 
--   ON public.sale_items(sale_id);
-- CREATE INDEX IF NOT EXISTS idx_sale_items_product_barcode 
--   ON public.sale_items(product_barcode);
-- CREATE INDEX IF NOT EXISTS idx_sale_items_sale_product 
--   ON public.sale_items(sale_id, product_barcode);

-- =============================================================================
-- PASO 3: ÍNDICES ADICIONALES RECOMENDADOS
-- =============================================================================

-- Índice en products.category para filtrado por categoría
CREATE INDEX IF NOT EXISTS idx_products_category 
  ON public.products(category) 
  WHERE category IS NOT NULL;

-- Índice en products.stock para detectar productos con bajo stock
CREATE INDEX IF NOT EXISTS idx_products_low_stock 
  ON public.products(stock) 
  WHERE stock < 10;

-- Índice en sales.ts para consultas por rango de fechas
CREATE INDEX IF NOT EXISTS idx_sales_ts 
  ON public.sales(ts DESC);

-- Índice en sales.device_id para filtrar ventas por dispositivo
CREATE INDEX IF NOT EXISTS idx_sales_device_id 
  ON public.sales(device_id) 
  WHERE device_id IS NOT NULL;

-- Índice en sales.payment_method para reportes
CREATE INDEX IF NOT EXISTS idx_sales_payment_method 
  ON public.sales(payment_method);

-- Índice en sales.client_sale_id para búsquedas por ID de cliente
CREATE INDEX IF NOT EXISTS idx_sales_client_sale_id 
  ON public.sales(client_sale_id) 
  WHERE client_sale_id IS NOT NULL;

-- Índice compuesto para reportes por fecha y método de pago
CREATE INDEX IF NOT EXISTS idx_sales_ts_payment 
  ON public.sales(ts DESC, payment_method);

-- NOTA: La columna items_json NO existe en tu tabla sales actual.
-- Los items probablemente se manejan de otra forma (tabla separada o normalizada).
-- Si en el futuro agregas items_json, puedes descomentar:
-- CREATE INDEX IF NOT EXISTS idx_sales_items_json_gin 
--   ON public.sales USING gin(items_json);

-- =============================================================================
-- PASO 4: ÍNDICES EXISTENTES QUE YA DEBERÍAN ESTAR (verificar)
-- =============================================================================
-- Estos índices deberían existir por ser claves primarias/únicas:
-- - products_pkey (barcode) - PK
-- - categories_pkey (name) - PK
-- - sales_pkey (id) - PK
-- - idx_product_suppliers_product (de suppliers_schema.sql)
-- - idx_product_suppliers_supplier (de suppliers_schema.sql)

-- =============================================================================
-- VERIFICACIÓN FINAL
-- =============================================================================
-- Ejecuta esta consulta para ver todos los índices y su tamaño:

-- SELECT 
--   t.relname AS table_name,
--   i.relname AS index_name,
--   array_to_string(array_agg(a.attname), ', ') AS columns,
--   pg_size_pretty(pg_relation_size(i.oid)) AS index_size,
--   idx.indisunique AS is_unique,
--   idx.indisprimary AS is_primary
-- FROM pg_class t
-- JOIN pg_index idx ON t.oid = idx.indrelid
-- JOIN pg_class i ON i.oid = idx.indexrelid
-- LEFT JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(idx.indkey)
-- WHERE t.relkind = 'r'
-- AND t.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
-- AND t.relname IN ('products', 'categories', 'sales', 'sale_items', 'suppliers', 'product_suppliers')
-- GROUP BY t.relname, i.relname, i.oid, idx.indisunique, idx.indisprimary
-- ORDER BY t.relname, i.relname;

-- Verificar estadísticas de uso de índices:
-- SELECT 
--   schemaname,
--   tablename,
--   indexname,
--   idx_scan AS index_scans,
--   idx_tup_read AS tuples_read,
--   idx_tup_fetch AS tuples_fetched
-- FROM pg_stat_user_indexes
-- WHERE schemaname = 'public'
-- AND tablename IN ('products', 'categories', 'sales', 'sale_items', 'suppliers', 'product_suppliers')
-- ORDER BY tablename, idx_scan DESC;
