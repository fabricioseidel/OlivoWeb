-- =====================================================================
-- 20260917000000_adoptar_codigo_escaneado.sql
--
-- Renombrar el código de un producto dejó de funcionar para cualquier
-- producto que ya se hubiera contado.
--
-- QUÉ ESTABA ROTO
--
-- `rename_product_barcode` (20260716) mueve el historial tabla por tabla
-- antes de tocar `products.barcode`. Cuando se escribió existían cuatro
-- tablas con el código: sale_items, inventory_movements, branch_stock y
-- product_suppliers. Después llegaron tres más:
--
--   * stock_count_entries  (20260910)
--   * stock_count_tags     (20260912)
--   * supplier_cost_history
--
-- Las tres primeras tienen FK a products(barcode) con ON UPDATE NO ACTION,
-- así que el UPDATE final del RPC falla con violación de clave foránea si
-- el producto tiene aunque sea una marca de conteo. Es decir: justo los
-- productos que se acaban de inventariar son los que no se pueden
-- renombrar. supplier_cost_history no tiene FK, así que no falla — se
-- queda huérfana en silencio, que es peor.
--
-- CÓMO QUEDA
--
-- El RPC mueve también esas tres tablas. El orden importa: primero los
-- hijos, al final el padre.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.rename_product_barcode(
  p_old_barcode text,
  p_new_barcode text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_old_barcode IS NULL OR p_old_barcode = '' OR p_new_barcode IS NULL OR p_new_barcode = '' THEN
    RAISE EXCEPTION 'Código de barras inválido';
  END IF;

  IF p_old_barcode = p_new_barcode THEN
    RAISE EXCEPTION 'El nuevo código es igual al actual';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.products WHERE barcode = p_old_barcode) THEN
    RAISE EXCEPTION 'No existe ningún producto con código %', p_old_barcode;
  END IF;

  IF EXISTS (SELECT 1 FROM public.products WHERE barcode = p_new_barcode) THEN
    RAISE EXCEPTION 'El código % ya está en uso por otro producto', p_new_barcode;
  END IF;

  UPDATE public.sale_items
     SET product_barcode = p_new_barcode
   WHERE product_barcode = p_old_barcode;

  UPDATE public.inventory_movements
     SET product_barcode = p_new_barcode
   WHERE product_barcode = p_old_barcode;

  UPDATE public.branch_stock bs
     SET product_barcode = p_new_barcode
   WHERE bs.product_barcode = p_old_barcode
     AND NOT EXISTS (
       SELECT 1 FROM public.branch_stock bs2
        WHERE bs2.branch_id = bs.branch_id AND bs2.product_barcode = p_new_barcode
     );

  -- El conteo físico: sin esto el UPDATE de products falla por FK en
  -- cuanto el producto tenga una marca guardada.
  UPDATE public.stock_count_tags
     SET product_barcode = p_new_barcode
   WHERE product_barcode = p_old_barcode;

  UPDATE public.stock_count_entries
     SET product_barcode = p_new_barcode
   WHERE product_barcode = p_old_barcode;

  UPDATE public.product_suppliers
     SET product_id = p_new_barcode
   WHERE product_id = p_old_barcode;

  -- Sin FK: no rompe el renombrado, pero se desconecta del producto.
  UPDATE public.supplier_cost_history
     SET product_barcode = p_new_barcode
   WHERE product_barcode = p_old_barcode;

  UPDATE public.products
     SET barcode = p_new_barcode
   WHERE barcode = p_old_barcode;
END;
$$;

COMMENT ON FUNCTION public.rename_product_barcode(text, text) IS
  'Cambia el código de barras de un producto arrastrando todo su historial. Las tablas hijas se actualizan antes que products porque las FK son ON UPDATE NO ACTION.';
