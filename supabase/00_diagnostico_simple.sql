-- =============================================================================
-- DIAGNÓSTICO SIMPLE - UNA SOLA CONSULTA
-- =============================================================================

SELECT 
  'Script 6' as script,
  'Tabla users' as elemento,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public')
    THEN '✅ EXISTE'
    ELSE '❌ FALTA - EJECUTAR SCRIPT 6'
  END as estado
  
UNION ALL

SELECT 
  'Script 7' as script,
  'Columna products.image_url' as elemento,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'products' 
        AND table_schema = 'public' 
        AND column_name = 'image_url'
    )
    THEN '✅ EXISTE'
    ELSE '❌ FALTA - EJECUTAR SCRIPT 7'
  END as estado

UNION ALL

SELECT 
  'Script 7' as script,
  'Columna products.gallery' as elemento,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'products' 
        AND table_schema = 'public' 
        AND column_name = 'gallery'
    )
    THEN '✅ EXISTE'
    ELSE '❌ FALTA - EJECUTAR SCRIPT 7'
  END as estado

UNION ALL

SELECT 
  'Script 7' as script,
  'Columna products.featured' as elemento,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'products' 
        AND table_schema = 'public' 
        AND column_name = 'featured'
    )
    THEN '✅ EXISTE'
    ELSE '❌ FALTA - EJECUTAR SCRIPT 7'
  END as estado

UNION ALL

SELECT 
  'Script 8' as script,
  'Tabla sale_items' as elemento,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sale_items' AND table_schema = 'public')
    THEN '✅ EXISTE'
    ELSE '❌ FALTA - EJECUTAR SCRIPT 8'
  END as estado

UNION ALL

SELECT 
  'Script 9' as script,
  'Función apply_sale con p_items' as elemento,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public' 
        AND p.proname = 'apply_sale'
        AND pg_get_function_arguments(p.oid) LIKE '%p_items%'
    )
    THEN '✅ EXISTE'
    ELSE '❌ FALTA - EJECUTAR SCRIPT 9'
  END as estado

UNION ALL

SELECT 
  'Script 10' as script,
  'Tabla sellers' as elemento,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sellers' AND table_schema = 'public')
    THEN '✅ EXISTE'
    ELSE '❌ FALTA - EJECUTAR SCRIPT 10'
  END as estado

UNION ALL

SELECT 
  'Script 10' as script,
  'Columna sales.seller_id' as elemento,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'sales' 
        AND table_schema = 'public' 
        AND column_name = 'seller_id'
    )
    THEN '✅ EXISTE'
    ELSE '❌ FALTA - EJECUTAR SCRIPT 10'
  END as estado

ORDER BY script, elemento;
