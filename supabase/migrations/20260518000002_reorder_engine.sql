-- =====================================================================
-- 20260518000002_reorder_engine.sql
-- Motor de reposicion semi-automatica:
--   1) Estado 'borrador' permitido en supplier_orders.status
--   2) get_reorder_suggestions(window, coverage, safety): velocidad de
--      venta combinada (POS sale_items + web order_items) y sugerencia
--      de cantidad por producto, asociada al proveedor primario
--      (priority mas baja en product_suppliers).
--   3) create_draft_supplier_orders(...): crea supplier_orders en
--      estado 'borrador' agrupadas por proveedor, con sus items.
-- =====================================================================

-- 1) ampliar CHECK constraint de status
ALTER TABLE public.supplier_orders
  DROP CONSTRAINT IF EXISTS supplier_orders_status_check;

ALTER TABLE public.supplier_orders
  ADD CONSTRAINT supplier_orders_status_check
  CHECK (status = ANY (ARRAY[
    'borrador'::text,
    'pendiente'::text,
    'confirmado'::text,
    'enviado_por_whatsapp'::text,
    'gestionado'::text,
    'recibido'::text,
    'cancelado'::text
  ]));

-- 2) sugerencias de reposicion
DROP FUNCTION IF EXISTS public.get_reorder_suggestions(int, int, int);

CREATE OR REPLACE FUNCTION public.get_reorder_suggestions(
  p_window_days int DEFAULT 30,
  p_coverage_days int DEFAULT 14,
  p_safety_days int DEFAULT 3
) RETURNS TABLE(
  barcode text,
  product_id bigint,
  name text,
  category text,
  stock numeric,
  reorder_threshold int,
  units_sold numeric,
  velocity_daily numeric,
  days_of_cover numeric,
  supplier_id uuid,
  supplier_name text,
  supplier_priority int,
  unit_cost numeric,
  pack_size int,
  default_reorder_qty int,
  suggested_qty int,
  estimated_cost numeric
) LANGUAGE sql STABLE AS $$
  WITH pos_sales AS (
    SELECT si.product_barcode AS barcode, SUM(si.quantity)::numeric AS qty
    FROM public.sale_items si
    JOIN public.sales sal ON sal.id = si.sale_id
    WHERE sal.ts > NOW() - (p_window_days || ' days')::interval
      AND COALESCE(sal.voided, false) = false
    GROUP BY si.product_barcode
  ),
  web_sales AS (
    SELECT oi.product_id AS barcode, SUM(oi.quantity)::numeric AS qty
    FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    WHERE o.created_at > NOW() - (p_window_days || ' days')::interval
      AND LOWER(COALESCE(o.status,'')) NOT IN ('cancelled','cancelado','refunded','reembolsado')
      AND LOWER(COALESCE(o.payment_status,'')) NOT IN ('cancelled','refunded','reembolsado')
    GROUP BY oi.product_id
  ),
  combined_sales AS (
    SELECT barcode, SUM(qty)::numeric AS qty
    FROM (
      SELECT * FROM pos_sales
      UNION ALL
      SELECT * FROM web_sales
    ) u
    GROUP BY barcode
  ),
  primary_supplier AS (
    SELECT DISTINCT ON (ps.product_id)
      ps.product_id,
      ps.supplier_id,
      ps.priority,
      ps.unit_cost,
      ps.pack_size,
      ps.default_reorder_qty,
      ps.reorder_threshold AS ps_reorder_threshold
    FROM public.product_suppliers ps
    ORDER BY ps.product_id, COALESCE(ps.priority, 999), ps.created_at
  ),
  base AS (
    SELECT
      p.barcode,
      p.id AS product_id,
      p.name,
      p.category,
      COALESCE(p.stock, 0)::numeric AS stock,
      COALESCE(ps.ps_reorder_threshold, p.reorder_threshold, 5) AS reorder_threshold,
      COALESCE(cs.qty, 0)::numeric AS units_sold,
      ps.supplier_id,
      sup.name AS supplier_name,
      ps.priority AS supplier_priority,
      ps.unit_cost,
      ps.pack_size,
      ps.default_reorder_qty,
      -- qty cruda (antes de pack rounding):
      GREATEST(
        0,
        CASE
          WHEN COALESCE(cs.qty, 0) > 0 THEN
            CEIL(
              (cs.qty::numeric / NULLIF(p_window_days,0)) * (p_coverage_days + p_safety_days)
              - COALESCE(p.stock, 0)
            )::int
          WHEN COALESCE(p.stock, 0) <= COALESCE(ps.ps_reorder_threshold, p.reorder_threshold, 5) THEN
            COALESCE(ps.default_reorder_qty,
                     GREATEST(COALESCE(p.reorder_threshold, 5) - COALESCE(p.stock, 0)::int, 0))
          ELSE 0
        END
      )::int AS qty_raw
    FROM public.products p
    LEFT JOIN combined_sales cs ON cs.barcode = p.barcode
    LEFT JOIN primary_supplier ps ON ps.product_id = p.barcode
    LEFT JOIN public.suppliers sup ON sup.id = ps.supplier_id
    WHERE COALESCE(p.is_active, true) = true
  )
  SELECT
    b.barcode,
    b.product_id,
    b.name,
    b.category,
    b.stock,
    b.reorder_threshold,
    b.units_sold,
    CASE WHEN p_window_days > 0
         THEN ROUND(b.units_sold / p_window_days, 3)
         ELSE 0::numeric END AS velocity_daily,
    CASE WHEN b.units_sold > 0
         THEN ROUND(b.stock / (b.units_sold / p_window_days), 1)
         ELSE NULL END AS days_of_cover,
    b.supplier_id,
    b.supplier_name,
    b.supplier_priority,
    b.unit_cost,
    b.pack_size,
    b.default_reorder_qty,
    -- pack rounding UP al multiplo de pack_size
    CASE
      WHEN b.qty_raw <= 0 THEN 0
      WHEN COALESCE(b.pack_size, 1) <= 1 THEN b.qty_raw
      ELSE (CEIL(b.qty_raw::numeric / b.pack_size) * b.pack_size)::int
    END AS suggested_qty,
    CASE
      WHEN b.qty_raw <= 0 THEN 0::numeric
      WHEN COALESCE(b.pack_size, 1) <= 1 THEN (b.qty_raw::numeric * COALESCE(b.unit_cost, 0))
      ELSE ((CEIL(b.qty_raw::numeric / b.pack_size) * b.pack_size)::numeric * COALESCE(b.unit_cost, 0))
    END AS estimated_cost
  FROM base b
  WHERE b.qty_raw > 0
  ORDER BY b.supplier_id NULLS LAST, b.name;
$$;

-- 3) generador de borradores
DROP FUNCTION IF EXISTS public.create_draft_supplier_orders(int, int, int, uuid);

CREATE OR REPLACE FUNCTION public.create_draft_supplier_orders(
  p_window_days int DEFAULT 30,
  p_coverage_days int DEFAULT 14,
  p_safety_days int DEFAULT 3,
  p_created_by uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE
  r record;
  v_order_id uuid;
  v_orders_created int := 0;
  v_items_created int := 0;
  v_total_amount numeric := 0;
  v_lead_days int;
  v_current_supplier uuid := NULL;
  v_expected_date date;
  v_orders_json jsonb := '[]'::jsonb;
  v_order_summary jsonb;
  v_subtotal numeric;
BEGIN
  FOR r IN
    SELECT *
    FROM public.get_reorder_suggestions(p_window_days, p_coverage_days, p_safety_days)
    WHERE supplier_id IS NOT NULL
      AND suggested_qty > 0
    ORDER BY supplier_id, name
  LOOP
    IF v_current_supplier IS NULL OR v_current_supplier <> r.supplier_id THEN
      IF v_current_supplier IS NOT NULL THEN
        v_orders_json := v_orders_json || jsonb_build_array(v_order_summary);
      END IF;

      SELECT lead_time_days INTO v_lead_days
        FROM public.suppliers WHERE id = r.supplier_id;
      v_expected_date := CURRENT_DATE + COALESCE(v_lead_days, 7);

      INSERT INTO public.supplier_orders (
        supplier_id, expected_date, status, notes, created_by, total
      ) VALUES (
        r.supplier_id,
        v_expected_date,
        'borrador',
        'Generado por motor de reposicion (' || p_window_days || 'd ventana, '
          || p_coverage_days || 'd cobertura, ' || p_safety_days || 'd safety)',
        p_created_by,
        0
      ) RETURNING id INTO v_order_id;

      v_orders_created := v_orders_created + 1;
      v_current_supplier := r.supplier_id;
      v_order_summary := jsonb_build_object(
        'order_id', v_order_id,
        'supplier_id', r.supplier_id,
        'supplier_name', r.supplier_name,
        'items', 0,
        'total', 0
      );
    END IF;

    v_subtotal := r.suggested_qty * COALESCE(r.unit_cost, 0);

    INSERT INTO public.supplier_order_items (
      order_id, product_id, supplier_sku, quantity, unit_cost, subtotal, notes
    ) VALUES (
      v_order_id,
      r.product_id,
      NULL,
      r.suggested_qty,
      COALESCE(r.unit_cost, 0),
      v_subtotal,
      'auto: vel=' || r.velocity_daily || '/d, stock=' || r.stock
        || ', cobertura=' || COALESCE(r.days_of_cover::text, 'sin ventas')
    );

    v_items_created := v_items_created + 1;
    v_total_amount := v_total_amount + v_subtotal;
    v_order_summary := jsonb_set(v_order_summary, '{items}',
      to_jsonb(((v_order_summary->>'items')::int) + 1));
    v_order_summary := jsonb_set(v_order_summary, '{total}',
      to_jsonb(((v_order_summary->>'total')::numeric) + v_subtotal));
  END LOOP;

  IF v_current_supplier IS NOT NULL THEN
    v_orders_json := v_orders_json || jsonb_build_array(v_order_summary);
  END IF;

  -- recalcular totales de las supplier_orders por si no hay trigger
  UPDATE public.supplier_orders so
     SET total = COALESCE(sub.s, 0)
    FROM (
      SELECT order_id, SUM(subtotal) AS s
      FROM public.supplier_order_items
      WHERE order_id IN (
        SELECT (elem->>'order_id')::uuid
        FROM jsonb_array_elements(v_orders_json) elem
      )
      GROUP BY order_id
    ) sub
   WHERE so.id = sub.order_id;

  RETURN jsonb_build_object(
    'orders_created', v_orders_created,
    'items_created', v_items_created,
    'total_amount', v_total_amount,
    'orders', v_orders_json
  );
END;
$$;
