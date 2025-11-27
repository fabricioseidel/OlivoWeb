-- =====================================================
-- SCRIPT DE VERIFICACIÓN: Productos y Proveedores
-- =====================================================
-- Fecha: 2025-10-30
-- Propósito: Verificar estructura y datos de las tablas
--            relacionadas con productos y proveedores
-- =====================================================

-- 1. Verificar estructura de tabla products
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'products'
ORDER BY ordinal_position;

-- 2. Verificar estructura de tabla product_suppliers
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'product_suppliers'
ORDER BY ordinal_position;

-- 3. Contar productos por proveedor
SELECT 
  s.id,
  s.name AS supplier_name,
  COUNT(ps.id) AS products_count
FROM suppliers s
LEFT JOIN product_suppliers ps ON s.id = ps.supplier_id
GROUP BY s.id, s.name
ORDER BY products_count DESC;

-- 4. Ver productos de un proveedor específico (ejemplo)
-- Reemplaza el UUID con el ID de tu proveedor
SELECT 
  p.id,
  p.name,
  p.barcode,
  p.stock,
  p.purchase_price,
  p.reorder_threshold,
  ps.supplier_sku,
  ps.unit_cost,
  ps.reorder_threshold AS supplier_reorder_threshold,
  ps.default_reorder_qty,
  ps.priority
FROM product_suppliers ps
JOIN products p ON ps.product_id = p.id
WHERE ps.supplier_id = '80b9c397-ccc7-4339-a640-f924ecdc17f0'
ORDER BY ps.priority, p.name;

-- 5. Verificar integridad: productos sin proveedor
SELECT 
  id,
  name,
  barcode,
  stock
FROM products p
WHERE NOT EXISTS (
  SELECT 1 FROM product_suppliers ps WHERE ps.product_id = p.id
)
LIMIT 10;

-- 6. Verificar integridad: relaciones huérfanas
SELECT 
  ps.id,
  ps.product_id,
  ps.supplier_id
FROM product_suppliers ps
WHERE NOT EXISTS (
  SELECT 1 FROM products p WHERE p.id = ps.product_id
)
OR NOT EXISTS (
  SELECT 1 FROM suppliers s WHERE s.id = ps.supplier_id
);

-- 7. Ver ejemplo completo de pedido potencial
SELECT 
  s.name AS proveedor,
  p.name AS producto,
  p.barcode AS codigo,
  p.stock AS stock_actual,
  COALESCE(ps.reorder_threshold, p.reorder_threshold, 10) AS umbral_reorden,
  GREATEST(
    COALESCE(ps.reorder_threshold, p.reorder_threshold, 10) - p.stock, 
    0
  ) AS deficit,
  COALESCE(ps.default_reorder_qty, 
    GREATEST(
      COALESCE(ps.reorder_threshold, p.reorder_threshold, 10) - p.stock, 
      1
    )
  ) AS cantidad_sugerida,
  COALESCE(ps.unit_cost, p.purchase_price, 0) AS costo_unitario,
  COALESCE(ps.default_reorder_qty, 
    GREATEST(
      COALESCE(ps.reorder_threshold, p.reorder_threshold, 10) - p.stock, 
      1
    )
  ) * COALESCE(ps.unit_cost, p.purchase_price, 0) AS total_estimado
FROM suppliers s
JOIN product_suppliers ps ON s.id = ps.supplier_id
JOIN products p ON ps.product_id = p.id
WHERE s.id = '80b9c397-ccc7-4339-a640-f924ecdc17f0'
  AND p.stock < COALESCE(ps.reorder_threshold, p.reorder_threshold, 10)
ORDER BY deficit DESC, p.name
LIMIT 20;
