/* Migration: atomic RPC to rename a product's barcode */
/* Date: 2026-07-16 */

/*
 * `products.barcode` is the business key used throughout the app (upserts
 * use `onConflict: 'barcode'`, ProductUI.id === barcode), even though the
 * table's real primary key is the numeric `id`. Several tables carry the
 * barcode as a plain text column with NO enforced foreign key in this
 * database (`sale_items.product_barcode`, `inventory_movements.product_barcode`,
 * `branch_stock.product_barcode`, `product_suppliers.product_id`) — so a
 * plain `UPDATE products SET barcode = 'new' WHERE barcode = 'old'` would
 * succeed but silently orphan all of that product's sales history,
 * inventory movements, per-branch stock, and supplier links.
 *
 * Retroactively adding real FK constraints with ON UPDATE CASCADE was
 * considered, but rejected: `ALTER TABLE ... ADD CONSTRAINT` validates
 * every existing row, and years of data entered with no FK enforcement at
 * all is likely to contain orphaned barcodes that would make the ALTER
 * fail outright — and adding ON DELETE RESTRICT/CASCADE for the first time
 * would also change today's product-delete behavior in ways nobody asked
 * for.
 *
 * Instead, this is a single atomic RPC that updates all of them in one
 * transaction (a plpgsql function body is transactional by default — an
 * exception anywhere rolls back everything already done in the call).
 */

CREATE OR REPLACE FUNCTION public.rename_product_barcode(p_old_barcode text, p_new_barcode text)
RETURNS void
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

  -- branch_stock's PK is (branch_id, product_barcode); skip a row if the
  -- new barcode already has a branch_stock row for that same branch
  -- (only possible if it belonged to some other, already-deleted product).
  UPDATE public.branch_stock bs
    SET product_barcode = p_new_barcode
    WHERE bs.product_barcode = p_old_barcode
      AND NOT EXISTS (
        SELECT 1 FROM public.branch_stock bs2
        WHERE bs2.branch_id = bs.branch_id AND bs2.product_barcode = p_new_barcode
      );

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'product_suppliers') THEN
    UPDATE public.product_suppliers
      SET product_id = p_new_barcode
      WHERE product_id = p_old_barcode;
  END IF;

  UPDATE public.products
    SET barcode = p_new_barcode
    WHERE barcode = p_old_barcode;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rename_product_barcode(text, text) TO service_role;
