-- Lote B: stock consistency web <-> POS
--
-- Hasta aquí, las RPCs de stock de la web (decrement_stock_atomic /
-- increment_product_stock) sólo tocaban products.stock. El POS lee de
-- branch_stock, por lo que una venta web NO se reflejaba en el POS y
-- una recepción de proveedor que actualizaba products.stock dejaba
-- branch_stock obsoleto. Resultado: stock desincronizado.
--
-- Esta migración:
--   1) Reemplaza decrement_stock_atomic / increment_product_stock por
--      versiones branch-aware que tocan branch_stock como fuente de
--      verdad, recalculan products.stock como suma global y registran
--      el movimiento en inventory_movements.
--   2) Agrega apply_reception_reverse para revertir una recepción
--      previamente aplicada cuando un pedido de proveedor se cancela.

-- Borramos las firmas antiguas: TODOS los callers se actualizan en este
-- mismo commit (src/app/api/checkout/create-order/route.ts).
DROP FUNCTION IF EXISTS public.decrement_stock_atomic(bigint, integer);
DROP FUNCTION IF EXISTS public.increment_product_stock(bigint, integer);

CREATE OR REPLACE FUNCTION public.decrement_stock_atomic(
  p_barcode   text,
  p_quantity  integer,
  p_branch_id uuid    DEFAULT NULL,
  p_reference text    DEFAULT NULL,
  p_reason    text    DEFAULT 'WEB_SALE'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_branch_id uuid;
  v_current   numeric;
BEGIN
  IF p_quantity IS NULL OR p_quantity <= 0 THEN RETURN FALSE; END IF;
  IF p_barcode  IS NULL THEN RETURN FALSE; END IF;

  v_branch_id := COALESCE(
    p_branch_id,
    (SELECT id FROM public.branches WHERE is_default = true LIMIT 1)
  );
  IF v_branch_id IS NULL THEN RETURN FALSE; END IF;

  SELECT stock INTO v_current
    FROM public.branch_stock
   WHERE branch_id = v_branch_id AND product_barcode = p_barcode
   FOR UPDATE;

  IF v_current IS NULL OR v_current < p_quantity THEN
    RETURN FALSE;
  END IF;

  UPDATE public.branch_stock
     SET stock = stock - p_quantity, updated_at = now()
   WHERE branch_id = v_branch_id AND product_barcode = p_barcode;

  UPDATE public.products
     SET stock = (SELECT COALESCE(SUM(stock), 0)
                    FROM public.branch_stock
                   WHERE product_barcode = p_barcode),
         updated_at = now()
   WHERE barcode = p_barcode;

  INSERT INTO public.inventory_movements (
    product_barcode, type, quantity, reason, reference_id, branch_id
  ) VALUES (
    p_barcode, 'OUT', p_quantity, COALESCE(p_reason, 'WEB_SALE'),
    p_reference, v_branch_id
  );

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_product_stock(
  p_barcode   text,
  p_quantity  integer,
  p_branch_id uuid    DEFAULT NULL,
  p_reference text    DEFAULT NULL,
  p_reason    text    DEFAULT 'WEB_SALE_ROLLBACK'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_branch_id uuid;
BEGIN
  IF p_quantity IS NULL OR p_quantity <= 0 THEN RETURN; END IF;
  IF p_barcode  IS NULL THEN RETURN; END IF;

  v_branch_id := COALESCE(
    p_branch_id,
    (SELECT id FROM public.branches WHERE is_default = true LIMIT 1)
  );
  IF v_branch_id IS NULL THEN RETURN; END IF;

  INSERT INTO public.branch_stock (branch_id, product_barcode, stock)
       VALUES (v_branch_id, p_barcode, 0)
   ON CONFLICT (branch_id, product_barcode) DO NOTHING;

  UPDATE public.branch_stock
     SET stock = stock + p_quantity, updated_at = now()
   WHERE branch_id = v_branch_id AND product_barcode = p_barcode;

  UPDATE public.products
     SET stock = (SELECT COALESCE(SUM(stock), 0)
                    FROM public.branch_stock
                   WHERE product_barcode = p_barcode),
         updated_at = now()
   WHERE barcode = p_barcode;

  INSERT INTO public.inventory_movements (
    product_barcode, type, quantity, reason, reference_id, branch_id
  ) VALUES (
    p_barcode, 'IN', p_quantity, COALESCE(p_reason, 'WEB_SALE_ROLLBACK'),
    p_reference, v_branch_id
  );
END;
$$;

-- Reverso de apply_reception: descuenta branch_stock y registra movimientos
-- OUT. Usado cuando un pedido de proveedor previamente recibido se cancela.
CREATE OR REPLACE FUNCTION public.apply_reception_reverse(
  p_items     jsonb,
  p_branch_id uuid DEFAULT NULL,
  p_reference text DEFAULT NULL,
  p_notes     text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  v_item      jsonb;
  v_barcode   text;
  v_qty       numeric;
  v_branch_id uuid;
  v_count     integer := 0;
BEGIN
  v_branch_id := COALESCE(
    p_branch_id,
    (SELECT id FROM public.branches WHERE is_default = true LIMIT 1)
  );

  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RETURN 0;
  END IF;

  FOR v_item IN SELECT jsonb_array_elements(p_items) LOOP
    v_barcode := v_item->>'barcode';
    v_qty     := COALESCE((v_item->>'qty')::numeric, 1);

    IF v_barcode IS NULL OR v_qty <= 0 THEN CONTINUE; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.products WHERE barcode = v_barcode) THEN
      CONTINUE;
    END IF;

    INSERT INTO public.branch_stock (branch_id, product_barcode, stock)
         VALUES (v_branch_id, v_barcode, 0)
     ON CONFLICT (branch_id, product_barcode) DO NOTHING;

    UPDATE public.branch_stock
       SET stock      = GREATEST(stock - v_qty, 0),
           updated_at = now()
     WHERE branch_id = v_branch_id AND product_barcode = v_barcode;

    UPDATE public.products
       SET stock      = (SELECT COALESCE(SUM(bs.stock), 0)
                           FROM public.branch_stock bs
                          WHERE bs.product_barcode = v_barcode),
           updated_at = now()
     WHERE barcode = v_barcode;

    INSERT INTO public.inventory_movements (
      product_barcode, type, quantity, reason, reference_id, branch_id
    ) VALUES (
      v_barcode, 'OUT', v_qty::integer,
      COALESCE(p_notes, 'RECEPTION_REVERSE'),
      p_reference, v_branch_id
    );

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;
