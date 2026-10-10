-- rename_product_barcode sigue fallando con productos que tienen historial.
--
-- QUÉ ESTÁ ROTO
--
-- 20260917000000 actualiza primero las tablas hijas y al final products,
-- creyendo que así respeta las FK ON UPDATE NO ACTION. No las respeta: una
-- FK no diferible se revisa al terminar CADA sentencia, así que el primer
-- UPDATE de branch_stock (o inventory_movements, product_suppliers, conteos)
-- ya falla porque el código nuevo todavía no existe en products:
--
--   ERROR: insert or update on table "branch_stock" violates foreign key
--          constraint "branch_stock_product_barcode_fkey"
--
-- Y hacerlo al revés (products primero) falla por el lado del padre. Hoy
-- sólo se puede renombrar un producto sin stock por sucursal, sin
-- movimientos, sin proveedor y sin conteos: casi ninguno. Reproducido en una
-- copia del esquema de producción (09-10-2026).
--
-- CÓMO QUEDA
--
-- Las cinco FK a products(barcode) pasan a DEFERRABLE INITIALLY IMMEDIATE:
-- para todo lo demás se comportan igual que hoy (se revisan al final de cada
-- sentencia). Sólo el RPC las difiere al final de su transacción con
-- SET CONSTRAINTS, mueve hijos y padre, y la base revisa todo junto al
-- confirmar. El cuerpo del RPC no cambia salvo esa línea.
--
-- Idempotente (ALTER CONSTRAINT sobre una FK ya diferible no hace nada).

ALTER TABLE public.branch_stock
  ALTER CONSTRAINT branch_stock_product_barcode_fkey DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE public.inventory_movements
  ALTER CONSTRAINT inventory_movements_product_barcode_fkey DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE public.product_suppliers
  ALTER CONSTRAINT product_suppliers_product_id_fkey DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE public.stock_count_entries
  ALTER CONSTRAINT stock_count_entries_product_barcode_fkey DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE public.stock_count_tags
  ALTER CONSTRAINT stock_count_tags_product_barcode_fkey DEFERRABLE INITIALLY IMMEDIATE;

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

  -- Hijos y padre se mueven en la misma transacción; las FK se revisan al
  -- confirmar, cuando todo ya apunta al código nuevo.
  SET CONSTRAINTS
    public.branch_stock_product_barcode_fkey,
    public.inventory_movements_product_barcode_fkey,
    public.product_suppliers_product_id_fkey,
    public.stock_count_entries_product_barcode_fkey,
    public.stock_count_tags_product_barcode_fkey
  DEFERRED;

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

  UPDATE public.stock_count_tags
     SET product_barcode = p_new_barcode
   WHERE product_barcode = p_old_barcode;

  UPDATE public.stock_count_entries
     SET product_barcode = p_new_barcode
   WHERE product_barcode = p_old_barcode;

  UPDATE public.product_suppliers
     SET product_id = p_new_barcode
   WHERE product_id = p_old_barcode;

  UPDATE public.supplier_cost_history
     SET product_barcode = p_new_barcode
   WHERE product_barcode = p_old_barcode;

  UPDATE public.products
     SET barcode = p_new_barcode
   WHERE barcode = p_old_barcode;
END;
$$;

COMMENT ON FUNCTION public.rename_product_barcode(text, text) IS
  'Cambia el código de barras de un producto arrastrando todo su historial. Las FK a products(barcode) son DEFERRABLE y el RPC las difiere al final de la transacción.';

-- Mismos permisos que antes (20260814033833 / 20260814033902).
REVOKE EXECUTE ON FUNCTION public.rename_product_barcode(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rename_product_barcode(text, text) TO service_role;
