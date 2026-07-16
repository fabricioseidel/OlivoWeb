/* Migration: allow renaming a product's barcode safely */
/* Date: 2026-07-16 */

/*
 * `products.barcode` is the business primary key used throughout the app
 * (upserts use `onConflict: 'barcode'`, ProductUI.id === barcode, etc).
 * Several tables reference it via FOREIGN KEY, but none of those
 * constraints had ON UPDATE CASCADE — so a plain
 *   UPDATE products SET barcode = 'new' WHERE barcode = 'old'
 * would fail with a foreign key violation for any product that already
 * has sales, inventory movements, per-branch stock, or a supplier link.
 *
 * This migration adds ON UPDATE CASCADE to every FK that references
 * products(barcode), so renaming a barcode transparently updates all
 * dependent rows in one statement. Constraint names are looked up
 * dynamically (rather than assumed) in case they differ from the
 * default Postgres naming convention.
 */

DO $$
DECLARE
  cname text;
BEGIN
  SELECT tc.constraint_name INTO cname
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
  WHERE tc.table_schema = 'public'
    AND tc.table_name = 'sale_items'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'product_barcode'
  LIMIT 1;

  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.sale_items DROP CONSTRAINT %I', cname);
  END IF;

  ALTER TABLE public.sale_items
    ADD CONSTRAINT sale_items_product_barcode_fkey
    FOREIGN KEY (product_barcode) REFERENCES public.products(barcode)
    ON DELETE RESTRICT ON UPDATE CASCADE;
END $$;

DO $$
DECLARE
  cname text;
BEGIN
  SELECT tc.constraint_name INTO cname
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
  WHERE tc.table_schema = 'public'
    AND tc.table_name = 'inventory_movements'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'product_barcode'
  LIMIT 1;

  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.inventory_movements DROP CONSTRAINT %I', cname);
  END IF;

  ALTER TABLE public.inventory_movements
    ADD CONSTRAINT inventory_movements_product_barcode_fkey
    FOREIGN KEY (product_barcode) REFERENCES public.products(barcode)
    ON DELETE CASCADE ON UPDATE CASCADE;
END $$;

DO $$
DECLARE
  cname text;
BEGIN
  SELECT tc.constraint_name INTO cname
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
  WHERE tc.table_schema = 'public'
    AND tc.table_name = 'branch_stock'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'product_barcode'
  LIMIT 1;

  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.branch_stock DROP CONSTRAINT %I', cname);
  END IF;

  ALTER TABLE public.branch_stock
    ADD CONSTRAINT branch_stock_product_barcode_fkey
    FOREIGN KEY (product_barcode) REFERENCES public.products(barcode)
    ON DELETE CASCADE ON UPDATE CASCADE;
END $$;

DO $$
DECLARE
  cname text;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'product_suppliers') THEN
    SELECT tc.constraint_name INTO cname
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'product_suppliers'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name = 'product_id'
    LIMIT 1;

    IF cname IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.product_suppliers DROP CONSTRAINT %I', cname);
    END IF;

    ALTER TABLE public.product_suppliers
      ADD CONSTRAINT product_suppliers_product_id_fkey
      FOREIGN KEY (product_id) REFERENCES public.products(barcode)
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
