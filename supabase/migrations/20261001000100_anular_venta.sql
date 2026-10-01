-- =====================================================================
-- 20261001000100_anular_venta.sql
--
-- 1) Anular una venta del POS. Hasta hoy existía la columna sales.voided pero
--    ninguna forma de usarla: un cobro equivocado quedaba para siempre en la
--    caja y en el stock. anular_venta marca la venta, guarda quién, cuándo y
--    por qué, y devuelve el stock a la sucursal donde se descontó, con su
--    movimiento de inventario. Todo en una transacción y con la venta
--    bloqueada, así que dos anulaciones simultáneas no devuelven el stock dos
--    veces.
--
-- 2) Las funciones RPC dejan de ser ejecutables con la clave pública. Ya no
--    servían (corren con los permisos de quien llama y anon no tiene acceso a
--    las tablas desde 20260929000100), pero así no dependen de eso.
--
-- Idempotente.
-- =====================================================================

ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS voided_at   timestamptz,
  ADD COLUMN IF NOT EXISTS void_reason text,
  ADD COLUMN IF NOT EXISTS voided_by   text;

CREATE OR REPLACE FUNCTION public.anular_venta(p_sale_id bigint, p_motivo text, p_actor text)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_sale  public.sales%ROWTYPE;
  v_item  record;
BEGIN
  IF coalesce(btrim(p_motivo), '') = '' THEN
    RAISE EXCEPTION 'Falta el motivo de la anulación';
  END IF;

  SELECT * INTO v_sale FROM public.sales WHERE id = p_sale_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'La venta % no existe', p_sale_id;
  END IF;
  IF v_sale.voided THEN
    RAISE EXCEPTION 'La venta % ya está anulada', p_sale_id;
  END IF;

  UPDATE public.sales
     SET voided = true, voided_at = now(), void_reason = btrim(p_motivo), voided_by = p_actor
   WHERE id = p_sale_id;

  FOR v_item IN
    SELECT product_barcode, quantity FROM public.sale_items WHERE sale_id = p_sale_id
  LOOP
    IF v_sale.branch_id IS NOT NULL THEN
      INSERT INTO public.branch_stock (branch_id, product_barcode, stock)
        VALUES (v_sale.branch_id, v_item.product_barcode, 0)
        ON CONFLICT (branch_id, product_barcode) DO NOTHING;
      UPDATE public.branch_stock
         SET stock = stock + v_item.quantity, updated_at = now()
       WHERE branch_id = v_sale.branch_id AND product_barcode = v_item.product_barcode;
      UPDATE public.products
         SET stock = (SELECT COALESCE(SUM(bs.stock), 0) FROM public.branch_stock bs
                       WHERE bs.product_barcode = v_item.product_barcode),
             updated_at = now()
       WHERE barcode = v_item.product_barcode;
    ELSE
      UPDATE public.products
         SET stock = stock + v_item.quantity, updated_at = now()
       WHERE barcode = v_item.product_barcode;
    END IF;

    INSERT INTO public.inventory_movements (product_barcode, type, quantity, reason, reference_id, branch_id)
    VALUES (v_item.product_barcode, 'IN', v_item.quantity, 'SALE_VOID', p_sale_id::text, v_sale.branch_id);
  END LOOP;
END;
$function$;

-- Funciones RPC: sólo el servidor (service_role).
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS fn
      FROM pg_proc p
     WHERE p.pronamespace = 'public'::regnamespace
       AND p.prokind = 'f'
       AND p.prorettype <> 'trigger'::regtype
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.fn);
  END LOOP;
END $$;

ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;
