-- =====================================================================
-- 20261121000000_stock_web_solo_minimarket.sql
--
-- La tienda web ofrece SOLO el stock del minimarket (la sucursal por
-- defecto), que es desde donde se despachan los pedidos.
--
-- Hasta ahora `products.stock` era la suma de todas las sucursales ACTIVAS.
-- Con una sola sede activa daba lo mismo. Al activar la sucursal, la web
-- habría ofrecido también lo que está físicamente allá, mientras el checkout
-- descuenta del minimarket (`create-order` usa la sucursal por defecto): el
-- cliente veía "quedan 8" y el pedido fallaba, o se vendía algo que no estaba.
--
-- Ahora `products.stock` = stock del minimarket. El POS ya no lo usa para el
-- mostrador: pide el stock de la sede en la que está (`/api/products?branchId`).
-- El stock de cada sede sigue en `branch_stock`, sin cambios.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.stock_derivado(p_barcode text)
RETURNS numeric
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(SUM(bs.stock), 0)
    FROM public.branch_stock bs
    JOIN public.branches b ON b.id = bs.branch_id
   WHERE bs.product_barcode = p_barcode
     AND b.is_default = true;
$$;

COMMENT ON FUNCTION public.stock_derivado(text) IS
  'Stock que ofrece la tienda web: el del minimarket (sucursal por defecto). El de cada sede esta en branch_stock.';

REVOKE ALL ON FUNCTION public.stock_derivado(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.stock_derivado(text) TO service_role;

-- Reconciliación: idempotente.
UPDATE public.products p
   SET stock = public.stock_derivado(p.barcode),
       updated_at = now()
 WHERE p.stock IS DISTINCT FROM public.stock_derivado(p.barcode);
