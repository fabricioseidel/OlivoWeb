-- Reconciliación puntual: branch_stock (sucursal Principal) quedó
-- desincronizado de products.stock desde el backfill inicial de
-- 20260515000001_branch_stock.sql. Los flujos de edición/importación de
-- productos (src/services/products.ts, usados por /api/products — panel
-- de Productos y Edición masiva) solo actualizan products.stock, nunca
-- branch_stock, que es lo que el checkout web realmente consulta y
-- descuenta (decrement_stock_atomic). Resultado: 634 de 648 productos
-- mostraban stock en el catálogo pero fallaban en el checkout con
-- "Stock insuficiente".
--
-- Confirmado por Fabri (30-jul-2026): products.stock es hoy el número
-- correcto, y por el momento ambas sucursales (Principal y Sucursal 2)
-- manejan un solo stock combinado, sin distinción real entre ellas. Por
-- eso esta reconciliación se aplica a todas las sucursales activas, no
-- solo a la default.

-- 1. Actualizar filas existentes que no coinciden, en todas las sucursales
UPDATE public.branch_stock bs
SET stock = p.stock, updated_at = now()
FROM public.products p
WHERE bs.product_barcode = p.barcode
  AND bs.stock IS DISTINCT FROM p.stock;

-- 2. Crear filas faltantes (producto x sucursal activa que nunca tuvo fila)
INSERT INTO public.branch_stock (branch_id, product_barcode, stock, min_stock)
SELECT
  b.id,
  p.barcode,
  COALESCE(p.stock, 0),
  COALESCE(p.min_stock, 5)
FROM public.products p
CROSS JOIN public.branches b
WHERE b.is_active = true
ON CONFLICT (branch_id, product_barcode) DO NOTHING;
