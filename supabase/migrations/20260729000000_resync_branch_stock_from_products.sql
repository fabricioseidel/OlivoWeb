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
-- Esta migración asume que products.stock es, hoy, el número correcto.
-- NO aplicar sin confirmar eso — no hay forma de saber desde el código
-- cuál de los dos campos refleja el inventario físico real.

-- 1. Actualizar filas existentes que no coinciden
UPDATE public.branch_stock bs
SET stock = p.stock, updated_at = now()
FROM public.products p
WHERE bs.product_barcode = p.barcode
  AND bs.branch_id = (SELECT id FROM public.branches WHERE is_default = true LIMIT 1)
  AND bs.stock IS DISTINCT FROM p.stock;

-- 2. Crear filas faltantes (productos que nunca tuvieron branch_stock)
INSERT INTO public.branch_stock (branch_id, product_barcode, stock, min_stock)
SELECT
  (SELECT id FROM public.branches WHERE is_default = true LIMIT 1),
  p.barcode,
  COALESCE(p.stock, 0),
  COALESCE(p.min_stock, 5)
FROM public.products p
ON CONFLICT (branch_id, product_barcode) DO NOTHING;
