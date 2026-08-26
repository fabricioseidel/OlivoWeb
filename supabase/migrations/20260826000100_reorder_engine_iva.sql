-- =====================================================================
-- 20260826000100_reorder_engine_iva.sql
--
-- El total de los pedidos a proveedor estaba un 19% por debajo de lo real.
--
-- El problema
-- -----------
-- `product_suppliers.unit_cost` es NETO (ver 20260826000000). El motor de
-- reposición calculaba `estimated_cost = cantidad × unit_cost` y esa cifra se
-- mostraba en pantalla como el costo del pedido. En un pedido de $400.000 la
-- diferencia con la factura son $76.000.
--
-- Y una consecuencia peor, que estaba escondida: `supplier_orders.total` se
-- llenaba con la suma de subtotales NETOS, pero
-- `CHECK (paid_amount >= 0 AND paid_amount <= total)` compara contra ese total.
-- Es decir: **registrar lo que realmente se pagó al proveedor era imposible**,
-- la base rechazaba la fila. Y `update_payment_status` marcaba como 'pagado'
-- un pedido al que todavía le faltaba el IVA.
--
-- La decisión
-- -----------
-- `total` pasa a ser LO QUE SE PAGA (con IVA) y aparece `total_net` al lado
-- para la contabilidad. Se elige así, y no al revés, porque `total` es lo que
-- ya leen todas las pantallas y lo que usan los dos CHECK de pago: cambiar el
-- significado del campo hacia el valor correcto arregla los tres sitios de una
-- vez, sin tocar código de aplicación.
--
-- Efecto visible al desplegar: los pedidos que figuraban como 'pagado' porque
-- se había registrado el neto pasan a 'parcial'. No es una regresión — es la
-- información correcta apareciendo por primera vez: a esos pedidos les falta
-- pagar el IVA, o falta registrar que se pagó.
--
-- `subtotal` de los ítems sigue siendo NETO — el
-- `CONSTRAINT valid_subtotal CHECK (subtotal = quantity * unit_cost)` obliga a
-- ello. El bruto se deriva en `subtotal_gross`. (Ese CHECK además impide
-- registrar una recepción parcial; se retira en la Fase 3, no acá.)
--
-- Idempotente.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) IVA en las líneas del pedido
-- ---------------------------------------------------------------------

ALTER TABLE public.supplier_order_items
  ADD COLUMN IF NOT EXISTS tax_rate numeric(5,2) NOT NULL DEFAULT 19;

ALTER TABLE public.supplier_order_items
  ADD COLUMN IF NOT EXISTS subtotal_gross numeric(12,2)
  GENERATED ALWAYS AS (ROUND(subtotal * (1 + COALESCE(tax_rate, 19) / 100), 2)) STORED;

COMMENT ON COLUMN public.supplier_order_items.unit_cost IS
  'Costo unitario SIN IVA, igual que product_suppliers.unit_cost.';
COMMENT ON COLUMN public.supplier_order_items.subtotal IS
  'Subtotal NETO (quantity * unit_cost). El valor con IVA está en subtotal_gross.';
COMMENT ON COLUMN public.supplier_order_items.subtotal_gross IS
  'Subtotal CON IVA: lo que realmente se paga por esta línea. Derivado.';

-- ---------------------------------------------------------------------
-- 2) El total del pedido pasa a ser lo que se paga
-- ---------------------------------------------------------------------

ALTER TABLE public.supplier_orders
  ADD COLUMN IF NOT EXISTS total_net numeric(12,2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.supplier_orders.total IS
  'Total CON IVA: lo que se le paga al proveedor. Es contra este valor que se validan los pagos.';
COMMENT ON COLUMN public.supplier_orders.total_net IS
  'Total sin IVA, suma de los subtotales netos de los ítems.';

CREATE OR REPLACE FUNCTION public.recalculate_supplier_order_total()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_order uuid := COALESCE(NEW.order_id, OLD.order_id);
BEGIN
  UPDATE public.supplier_orders so
     SET total     = COALESCE(sub.bruto, 0),
         total_net = COALESCE(sub.neto, 0)
    FROM (
      SELECT SUM(subtotal_gross) AS bruto, SUM(subtotal) AS neto
        FROM public.supplier_order_items
       WHERE order_id = v_order
    ) sub
   WHERE so.id = v_order;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Recalcular los pedidos ya existentes. Sólo los que tienen ítems: un pedido
-- con total tecleado a mano y sin líneas quedaría en cero.
UPDATE public.supplier_orders so
   SET total     = sub.bruto,
       total_net = sub.neto
  FROM (
    SELECT order_id, SUM(subtotal_gross) AS bruto, SUM(subtotal) AS neto
      FROM public.supplier_order_items
     GROUP BY order_id
  ) sub
 WHERE so.id = sub.order_id
   AND so.total IS DISTINCT FROM sub.bruto;

-- ---------------------------------------------------------------------
-- 3) El motor de reposición estima lo que se va a pagar
-- ---------------------------------------------------------------------
-- `estimated_cost` pasa a ser el costo CON IVA. No se agrega una columna nueva
-- y se deja la vieja mal: la cifra que las pantallas ya muestran como "costo
-- estimado" tiene que ser la correcta, o seguirán mostrando la equivocada.

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
  unit_cost numeric,          -- neto
  tax_rate numeric,
  unit_cost_gross numeric,    -- con IVA
  pack_size int,
  default_reorder_qty int,
  suggested_qty int,
  estimated_cost numeric,     -- CON IVA: lo que se va a pagar
  estimated_cost_net numeric  -- sin IVA, para contabilidad
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
      ps.tax_rate,
      ps.unit_cost_gross,
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
      COALESCE(ps.tax_rate, 19)::numeric AS tax_rate,
      ps.unit_cost_gross,
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
  ),
  conteo AS (
    SELECT
      b.*,
      -- pack rounding UP al múltiplo de pack_size
      CASE
        WHEN b.qty_raw <= 0 THEN 0
        WHEN COALESCE(b.pack_size, 1) <= 1 THEN b.qty_raw
        ELSE (CEIL(b.qty_raw::numeric / b.pack_size) * b.pack_size)::int
      END AS qty_final
    FROM base b
  )
  SELECT
    c.barcode,
    c.product_id,
    c.name,
    c.category,
    c.stock,
    c.reorder_threshold,
    c.units_sold,
    CASE WHEN p_window_days > 0
         THEN ROUND(c.units_sold / p_window_days, 3)
         ELSE 0::numeric END AS velocity_daily,
    CASE WHEN c.units_sold > 0
         THEN ROUND(c.stock / (c.units_sold / p_window_days), 1)
         ELSE NULL END AS days_of_cover,
    c.supplier_id,
    c.supplier_name,
    c.supplier_priority,
    c.unit_cost,
    c.tax_rate,
    c.unit_cost_gross,
    c.pack_size,
    c.default_reorder_qty,
    c.qty_final AS suggested_qty,
    ROUND(c.qty_final::numeric * COALESCE(c.unit_cost_gross, 0), 2) AS estimated_cost,
    ROUND(c.qty_final::numeric * COALESCE(c.unit_cost, 0), 2) AS estimated_cost_net
  FROM conteo c
  WHERE c.qty_raw > 0
  ORDER BY c.supplier_id NULLS LAST, c.name;
$$;

COMMENT ON FUNCTION public.get_reorder_suggestions(int, int, int) IS
  'Sugerencias de reposición. estimated_cost incluye IVA (es lo que se paga); estimated_cost_net es el neto.';

-- ---------------------------------------------------------------------
-- 4) Los borradores registran la tasa y devuelven el total real
-- ---------------------------------------------------------------------

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
  v_total_amount numeric := 0;   -- con IVA
  v_lead_days int;
  v_current_supplier uuid := NULL;
  v_expected_date date;
  v_orders_json jsonb := '[]'::jsonb;
  v_order_summary jsonb;
  v_subtotal numeric;
  v_subtotal_gross numeric;
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

    -- El subtotal guardado es neto: lo exige valid_subtotal.
    v_subtotal := ROUND(r.suggested_qty * COALESCE(r.unit_cost, 0), 2);
    v_subtotal_gross := ROUND(v_subtotal * (1 + COALESCE(r.tax_rate, 19) / 100), 2);

    INSERT INTO public.supplier_order_items (
      order_id, product_id, supplier_sku, quantity, unit_cost, tax_rate, subtotal, notes
    ) VALUES (
      v_order_id,
      r.product_id,
      NULL,
      r.suggested_qty,
      COALESCE(r.unit_cost, 0),
      COALESCE(r.tax_rate, 19),
      v_subtotal,
      'auto: vel=' || r.velocity_daily || '/d, stock=' || r.stock
        || ', cobertura=' || COALESCE(r.days_of_cover::text, 'sin ventas')
    );

    v_items_created := v_items_created + 1;
    v_total_amount := v_total_amount + v_subtotal_gross;
    v_order_summary := jsonb_set(v_order_summary, '{items}',
      to_jsonb(((v_order_summary->>'items')::int) + 1));
    v_order_summary := jsonb_set(v_order_summary, '{total}',
      to_jsonb(((v_order_summary->>'total')::numeric) + v_subtotal_gross));
  END LOOP;

  IF v_current_supplier IS NOT NULL THEN
    v_orders_json := v_orders_json || jsonb_build_array(v_order_summary);
  END IF;

  -- Recalcular por si el trigger no estuviera activo.
  UPDATE public.supplier_orders so
     SET total     = COALESCE(sub.bruto, 0),
         total_net = COALESCE(sub.neto, 0)
    FROM (
      SELECT order_id, SUM(subtotal_gross) AS bruto, SUM(subtotal) AS neto
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
    'total_amount', v_total_amount,   -- con IVA
    'orders', v_orders_json
  );
END;
$$;

COMMENT ON FUNCTION public.create_draft_supplier_orders(int, int, int, uuid) IS
  'Crea borradores de pedido agrupados por proveedor. total_amount y orders[].total incluyen IVA.';
