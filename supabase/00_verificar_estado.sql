-- =============================================================================
-- SCRIPT 0: VERIFICAR ESTADO ACTUAL DE SUPABASE
-- =============================================================================
-- Fecha: 2025-10-28
-- Propósito: Diagnosticar qué scripts ya se ejecutaron
-- =============================================================================

-- =============================================================================
-- PASO 1: VERIFICAR TABLAS EXISTENTES
-- =============================================================================

SELECT 
  '📊 TABLAS EXISTENTES' as seccion,
  '' as estado;

SELECT 
  table_name,
  CASE 
    WHEN table_name = 'users' THEN '⭐ CRÍTICO - Script 6'
    WHEN table_name = 'sellers' THEN '⭐ CRÍTICO - Script 10'
    WHEN table_name = 'sale_items' THEN '⭐ CRÍTICO - Script 8'
    WHEN table_name = 'products' THEN '✅ Base'
    WHEN table_name = 'sales' THEN '✅ Base'
    WHEN table_name = 'categories' THEN '✅ Base'
    WHEN table_name = 'suppliers' THEN '✅ Base'
    WHEN table_name = 'product_suppliers' THEN '✅ Base'
    ELSE '📋 Otra'
  END as importancia,
  '✅ Existe' as estado
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- =============================================================================
-- PASO 2: VERIFICAR COLUMNAS CRÍTICAS EN products
-- =============================================================================

SELECT 
  '📊 COLUMNAS DE products' as seccion,
  '' as estado;

SELECT 
  column_name,
  data_type,
  CASE 
    WHEN column_name IN ('image_url', 'gallery', 'featured', 'reorder_threshold', 'description', 'created_at') 
    THEN '⭐ Script 7 - DEBE EXISTIR'
    ELSE '✅ Base'
  END as importancia,
  CASE 
    WHEN is_nullable = 'YES' THEN 'NULL permitido'
    ELSE 'NOT NULL'
  END as nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'products'
ORDER BY ordinal_position;

-- =============================================================================
-- PASO 3: VERIFICAR COLUMNAS CRÍTICAS EN sales
-- =============================================================================

SELECT 
  '📊 COLUMNAS DE sales' as seccion,
  '' as estado;

SELECT 
  column_name,
  data_type,
  CASE 
    WHEN column_name = 'seller_id' THEN '⭐ Script 10 - DEBE EXISTIR'
    WHEN column_name = 'items_json' THEN '❌ NO DEBE EXISTIR (reemplazado por sale_items)'
    ELSE '✅ Base'
  END as importancia,
  CASE 
    WHEN is_nullable = 'YES' THEN 'NULL permitido'
    ELSE 'NOT NULL'
  END as nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'sales'
ORDER BY ordinal_position;

-- =============================================================================
-- PASO 4: VERIFICAR FUNCIONES CRÍTICAS
-- =============================================================================

SELECT 
  '📊 FUNCIONES IMPORTANTES' as seccion,
  '' as estado;

SELECT 
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as parametros,
  CASE 
    WHEN p.proname = 'apply_sale' THEN '⭐ CRÍTICO - Script 9'
    WHEN p.proname = 'get_sale_items' THEN '⭐ Script 9'
    WHEN p.proname = 'void_sale' THEN '⭐ Script 9'
    WHEN p.proname = 'update_seller_activity' THEN '⭐ Script 10'
    WHEN p.proname = 'set_updated_at' THEN '✅ Base'
    ELSE '📋 Otra'
  END as importancia
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN ('apply_sale', 'get_sale_items', 'void_sale', 'update_seller_activity', 'set_updated_at')
ORDER BY p.proname;

-- =============================================================================
-- PASO 5: VERIFICAR RLS (ROW LEVEL SECURITY)
-- =============================================================================

SELECT 
  '📊 RLS HABILITADO' as seccion,
  '' as estado;

SELECT 
  tablename,
  CASE 
    WHEN rowsecurity THEN '✅ HABILITADO'
    ELSE '❌ DESHABILITADO'
  END as rls_status,
  CASE 
    WHEN tablename IN ('users', 'sellers', 'sale_items') THEN '⭐ Debe estar habilitado'
    ELSE '✅ Debe estar habilitado'
  END as importancia
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- =============================================================================
-- PASO 6: VERIFICAR VISTAS
-- =============================================================================

SELECT 
  '📊 VISTAS CREADAS' as seccion,
  '' as estado;

SELECT 
  table_name as view_name,
  CASE 
    WHEN table_name = 'sales_with_items' THEN '⭐ Script 8'
    WHEN table_name = 'sales_by_seller' THEN '⭐ Script 10'
    ELSE '📋 Otra'
  END as importancia,
  '✅ Existe' as estado
FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name IN ('sales_with_items', 'sales_by_seller', 'inventory_status')
ORDER BY table_name;

-- =============================================================================
-- PASO 7: VERIFICAR EXTENSIONES
-- =============================================================================

SELECT 
  '📊 EXTENSIONES INSTALADAS' as seccion,
  '' as estado;

SELECT 
  e.extname AS extension_name,
  n.nspname AS schema_name,
  e.extversion AS version,
  CASE 
    WHEN n.nspname = 'extensions' THEN '✅ Ubicación correcta'
    WHEN n.nspname = 'public' THEN '⚠️ Debe estar en schema extensions'
    ELSE '❓ Ubicación desconocida'
  END as estado
FROM pg_extension e
JOIN pg_namespace n ON e.extnamespace = n.oid
WHERE e.extname IN ('pg_trgm', 'citext', 'uuid-ossp')
ORDER BY e.extname;

-- =============================================================================
-- PASO 8: CONTAR REGISTROS
-- =============================================================================

SELECT 
  '📊 CONTEO DE REGISTROS' as seccion,
  '' as estado;

DO $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Users
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public') THEN
    SELECT COUNT(*) INTO v_count FROM public.users;
    RAISE NOTICE 'users: % registros', v_count;
  ELSE
    RAISE NOTICE 'users: ❌ Tabla NO existe (ejecutar Script 6)';
  END IF;

  -- Sellers
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sellers' AND table_schema = 'public') THEN
    SELECT COUNT(*) INTO v_count FROM public.sellers;
    RAISE NOTICE 'sellers: % registros', v_count;
  ELSE
    RAISE NOTICE 'sellers: ❌ Tabla NO existe (ejecutar Script 10)';
  END IF;

  -- Sale_items
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sale_items' AND table_schema = 'public') THEN
    SELECT COUNT(*) INTO v_count FROM public.sale_items;
    RAISE NOTICE 'sale_items: % registros', v_count;
  ELSE
    RAISE NOTICE 'sale_items: ❌ Tabla NO existe (ejecutar Script 8)';
  END IF;

  -- Products
  SELECT COUNT(*) INTO v_count FROM public.products;
  RAISE NOTICE 'products: % registros', v_count;

  -- Sales
  SELECT COUNT(*) INTO v_count FROM public.sales;
  RAISE NOTICE 'sales: % registros', v_count;

  -- Categories
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'categories' AND table_schema = 'public') THEN
    SELECT COUNT(*) INTO v_count FROM public.categories;
    RAISE NOTICE 'categories: % registros', v_count;
  END IF;
END $$;

-- =============================================================================
-- RESUMEN: CHECKLIST DE SCRIPTS
-- =============================================================================

SELECT 
  '📋 CHECKLIST DE SCRIPTS' as seccion,
  '' as estado;

SELECT 
  '6' as script_num,
  'Crear tabla users' as descripcion,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public')
    THEN '✅ EJECUTADO'
    ELSE '❌ PENDIENTE'
  END as estado;

SELECT 
  '7' as script_num,
  'Agregar columnas a products' as descripcion,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'products' 
        AND table_schema = 'public' 
        AND column_name = 'image_url'
    )
    THEN '✅ EJECUTADO'
    ELSE '❌ PENDIENTE'
  END as estado;

SELECT 
  '8' as script_num,
  'Crear tabla sale_items' as descripcion,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sale_items' AND table_schema = 'public')
    THEN '✅ EJECUTADO'
    ELSE '❌ PENDIENTE'
  END as estado;

SELECT 
  '9' as script_num,
  'Actualizar función apply_sale' as descripcion,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public' 
        AND p.proname = 'apply_sale'
        AND pg_get_function_arguments(p.oid) LIKE '%p_items%'
    )
    THEN '✅ EJECUTADO'
    ELSE '❌ PENDIENTE'
  END as estado;

SELECT 
  '10' as script_num,
  'Crear tabla sellers' as descripcion,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sellers' AND table_schema = 'public')
    THEN '✅ EJECUTADO'
    ELSE '❌ PENDIENTE'
  END as estado;

-- =============================================================================
-- FIN DEL DIAGNÓSTICO
-- =============================================================================

SELECT 
  '✅ DIAGNÓSTICO COMPLETADO' as mensaje,
  'Revisa los resultados arriba para saber qué scripts ejecutar' as accion;
