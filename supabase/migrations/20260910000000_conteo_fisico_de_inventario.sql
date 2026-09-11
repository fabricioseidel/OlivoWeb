-- =====================================================================
-- 20260910000000_conteo_fisico_de_inventario.sql
--
-- Permite hacer un conteo físico real (dejar el inventario en la cantidad
-- contada, no sumarle) sin corromper el stock, y cierra las tres vías por
-- las que "sumaba de distintas fuentes".
--
-- QUÉ PASABA AL INTENTAR CONTAR CON RECEPCIÓN
--
-- 1. Recepción es ADITIVA (`apply_reception` hace `stock = stock + qty`).
--    Contar con ella suma sobre lo que el sistema ya creía tener: si decía
--    12 y en la góndola hay 5, queda 17. No existía ninguna forma de decir
--    "hay exactamente 5" ni "hay 0" desde el mostrador.
--
-- 2. Recepción NO tenía deduplicación. Las ventas sí (`p_client_sale_id`).
--    El outbox del POS reencola cualquier escritura cuyo `fetch` falle por
--    red — y una respuesta que no llega por timeout (la bodega es justo
--    donde peor entra el wifi) es indistinguible de una que nunca salió.
--    Resultado: la misma recepción aplicada dos veces, stock al doble.
--
-- 3. Tres escritores distintos de `products.stock` a la vez:
--      a) las RPC, con `SUM(branch_stock)` sin filtrar sucursal activa;
--      b) el trigger `tr_inventory_movement_stock` sobre
--         `inventory_movements`, con `stock = stock + quantity` (fórmula
--         incremental, distinta de la anterior);
--      c) el trigger `products_stock_derivado` (20260828000000), que es el
--         correcto.
--    Hoy (c) gana por orden de ejecución, así que el número queda bien de
--    milagro: (a) y (b) escriben y son sobreescritos. Pero son tres
--    fuentes escribiendo la misma columna, y basta tocar el orden para que
--    vuelva a romperse. Acá se queda sólo (c).
--
-- CÓMO SE CUENTA A PARTIR DE AHORA
--
-- Una sesión de conteo por sucursal. Cada escaneo fija la cantidad contada
-- (absoluta, no suma) y deja el delta en `inventory_movements`. Al cerrar,
-- lo que nunca se contó queda en 0 y se desactiva: eso es "los productos
-- disponibles a la fecha".
--
-- No hace falta poner todo en 0 antes de empezar — y conviene no hacerlo:
-- durante el conteo la tienda sigue vendiendo, y un catálogo en cero
-- rechaza las ventas web. Fijar cada cantidad y dejar que el cierre barra
-- lo no contado da el mismo resultado sin ese hueco. Igual queda
-- disponible `p_zero_now` en `open_stock_count` para quien lo prefiera.
--
-- Todo es idempotente: `apply_stock_absolute` fija un valor (reaplicarla no
-- cambia nada) y además lleva un registro de operaciones ya aplicadas por
-- `op_id`, igual que `apply_sale`. Un reintento del outbox no puede
-- duplicar nada.
-- =====================================================================

-- ─────────────────────────────────────────────────────────────────────
-- 1. Registro de operaciones aplicadas (idempotencia)
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.stock_ops (
  op_id      text PRIMARY KEY,
  kind       text NOT NULL,
  branch_id  uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  items      integer NOT NULL DEFAULT 0,
  applied_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.stock_ops IS
  'Operaciones de stock ya aplicadas, por op_id generado en el cliente. Es lo que hace que un reintento del outbox del POS no vuelva a mover stock.';

ALTER TABLE public.stock_ops ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'stock_ops'
       AND policyname = 'stock_ops_all_service'
  ) THEN
    CREATE POLICY "stock_ops_all_service" ON public.stock_ops
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Devuelve true si esta operación es nueva (y la registra); false si ya se
-- había aplicado antes. La condición de carrera la resuelve la PK.
CREATE OR REPLACE FUNCTION public.stock_op_reservar(
  p_op_id     text,
  p_kind      text,
  p_branch_id uuid,
  p_items     integer
) RETURNS boolean
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_filas integer := 0;
BEGIN
  IF p_op_id IS NULL OR btrim(p_op_id) = '' THEN
    RETURN true; -- sin op_id no hay deduplicación posible: se aplica
  END IF;

  INSERT INTO public.stock_ops (op_id, kind, branch_id, items)
       VALUES (p_op_id, p_kind, p_branch_id, COALESCE(p_items, 0))
  ON CONFLICT (op_id) DO NOTHING;

  GET DIAGNOSTICS v_filas = ROW_COUNT;
  RETURN v_filas > 0;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 2. Sesiones de conteo
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.stock_count_sessions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id      uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  status         text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','CLOSED')),
  opened_at      timestamptz NOT NULL DEFAULT now(),
  opened_by      text,
  closed_at      timestamptz,
  closed_by      text,
  zeroed_on_open boolean NOT NULL DEFAULT false,
  notes          text
);

COMMENT ON TABLE public.stock_count_sessions IS
  'Una toma de inventario física. Sólo puede haber una abierta por sucursal.';

-- Una sola sesión abierta por sucursal: dos conteos en paralelo sobre la
-- misma bodega se pisan y el cierre borraría lo que el otro contó.
CREATE UNIQUE INDEX IF NOT EXISTS stock_count_sessions_una_abierta
  ON public.stock_count_sessions (branch_id)
  WHERE status = 'OPEN';

CREATE TABLE IF NOT EXISTS public.stock_count_entries (
  session_id      uuid NOT NULL REFERENCES public.stock_count_sessions(id) ON DELETE CASCADE,
  product_barcode text NOT NULL REFERENCES public.products(barcode) ON DELETE CASCADE,
  counted_qty     numeric NOT NULL,
  -- Stock que el sistema tenía la PRIMERA vez que se contó este producto en
  -- esta sesión. Es contra esto que se mide la diferencia del conteo; si se
  -- recuenta, no se actualiza (si no, la diferencia se perdería).
  system_qty      numeric NOT NULL DEFAULT 0,
  counted_at      timestamptz NOT NULL DEFAULT now(),
  counted_by      text,
  PRIMARY KEY (session_id, product_barcode)
);

CREATE INDEX IF NOT EXISTS idx_stock_count_entries_session
  ON public.stock_count_entries (session_id);

ALTER TABLE public.stock_count_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_count_entries  ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'stock_count_sessions'
       AND policyname = 'stock_count_sessions_all_service'
  ) THEN
    CREATE POLICY "stock_count_sessions_all_service" ON public.stock_count_sessions
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'stock_count_entries'
       AND policyname = 'stock_count_entries_all_service'
  ) THEN
    CREATE POLICY "stock_count_entries_all_service" ON public.stock_count_entries
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────
-- 3. apply_stock_absolute — la única forma de fijar cantidades exactas
-- ─────────────────────────────────────────────────────────────────────
--
-- `p_items`: [{ "barcode": "...", "qty": 5 }]. `qty = 0` es un valor
-- válido y significativo: "no hay ninguno".
--
-- No escribe `products.stock`: mueve `branch_stock`, que es la fuente de
-- verdad, y el trigger `branch_stock_sync_products` propaga el derivado.

CREATE OR REPLACE FUNCTION public.apply_stock_absolute(
  p_items      jsonb,
  p_branch_id  uuid DEFAULT NULL,
  p_op_id      text DEFAULT NULL,
  p_reason     text DEFAULT 'STOCK_COUNT',
  p_session_id uuid DEFAULT NULL,
  p_counted_by text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_item         jsonb;
  v_barcode      text;
  v_qty          numeric;
  v_actual       numeric;
  v_delta        numeric;
  v_branch_id    uuid;
  v_aplicados    integer := 0;
  v_ajustados    integer := 0;
  v_desconocidos text[] := '{}';
  v_reason       text := COALESCE(NULLIF(btrim(p_reason), ''), 'STOCK_COUNT');
BEGIN
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'No hay ítems');
  END IF;

  v_branch_id := COALESCE(
    p_branch_id,
    (SELECT id FROM public.branches WHERE is_default = true LIMIT 1)
  );
  IF v_branch_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'No hay sucursal configurada');
  END IF;

  -- Ya aplicada: no se vuelve a tocar nada. Se responde ok para que el
  -- outbox del cliente la dé por entregada y la saque de la cola.
  IF NOT public.stock_op_reservar(p_op_id, 'STOCK_ABSOLUTE', v_branch_id,
                                  jsonb_array_length(p_items)) THEN
    RETURN jsonb_build_object('ok', true, 'yaAplicada', true,
                              'aplicados', 0, 'ajustados', 0);
  END IF;

  FOR v_item IN SELECT jsonb_array_elements(p_items) LOOP
    v_barcode := btrim(COALESCE(v_item->>'barcode', ''));
    v_qty     := COALESCE((v_item->>'qty')::numeric, -1);

    IF v_barcode = '' OR v_qty < 0 THEN CONTINUE; END IF;

    IF NOT EXISTS (SELECT 1 FROM public.products WHERE barcode = v_barcode) THEN
      v_desconocidos := v_desconocidos || v_barcode;
      CONTINUE;
    END IF;

    INSERT INTO public.branch_stock (branch_id, product_barcode, stock)
         VALUES (v_branch_id, v_barcode, 0)
     ON CONFLICT (branch_id, product_barcode) DO NOTHING;

    SELECT stock INTO v_actual
      FROM public.branch_stock
     WHERE branch_id = v_branch_id AND product_barcode = v_barcode
       FOR UPDATE;

    v_actual := COALESCE(v_actual, 0);
    v_delta  := v_qty - v_actual;

    IF v_delta <> 0 THEN
      UPDATE public.branch_stock
         SET stock = v_qty, updated_at = now()
       WHERE branch_id = v_branch_id AND product_barcode = v_barcode;

      INSERT INTO public.inventory_movements (
        product_barcode, type, quantity, reason, reference_id, branch_id
      ) VALUES (
        v_barcode,
        CASE WHEN v_delta > 0 THEN 'IN'::movement_type ELSE 'OUT'::movement_type END,
        abs(v_delta), v_reason,
        COALESCE(p_session_id::text, p_op_id), v_branch_id
      );

      v_ajustados := v_ajustados + 1;
    END IF;

    IF p_session_id IS NOT NULL THEN
      INSERT INTO public.stock_count_entries (
        session_id, product_barcode, counted_qty, system_qty, counted_by
      ) VALUES (
        p_session_id, v_barcode, v_qty, v_actual, p_counted_by
      )
      ON CONFLICT (session_id, product_barcode) DO UPDATE
        SET counted_qty = EXCLUDED.counted_qty,
            counted_at  = now(),
            counted_by  = EXCLUDED.counted_by;
      -- system_qty a propósito NO se actualiza: es el stock previo al conteo.
    END IF;

    -- Contado y con existencias: está en la tienda, queda disponible ya
    -- mismo (no hay que esperar el cierre para poder venderlo).
    IF v_qty > 0 THEN
      UPDATE public.products
         SET is_active   = true,
             verified_at = now(),
             verified_by = COALESCE(p_counted_by, verified_by)
       WHERE barcode = v_barcode
         AND (is_active IS DISTINCT FROM true OR verified_at IS NULL);
    END IF;

    v_aplicados := v_aplicados + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'aplicados', v_aplicados,
    'ajustados', v_ajustados,
    'desconocidos', to_jsonb(v_desconocidos)
  );
END;
$$;

COMMENT ON FUNCTION public.apply_stock_absolute(jsonb, uuid, text, text, uuid, text) IS
  'Fija el stock de cada producto en la cantidad indicada (absoluto, no suma) y deja el delta en inventory_movements. Idempotente por p_op_id. Es la puerta para conteos fisicos y ajustes manuales.';

-- ─────────────────────────────────────────────────────────────────────
-- 4. Abrir / consultar / cerrar una sesión de conteo
-- ─────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.open_stock_count(
  p_branch_id uuid DEFAULT NULL,
  p_opened_by text DEFAULT NULL,
  p_zero_now  boolean DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_branch_id uuid;
  v_session   public.stock_count_sessions;
  v_puestos   integer := 0;
BEGIN
  v_branch_id := COALESCE(
    p_branch_id,
    (SELECT id FROM public.branches WHERE is_default = true LIMIT 1)
  );
  IF v_branch_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'No hay sucursal configurada');
  END IF;

  -- Si ya hay una abierta se devuelve esa: volver a entrar a la pestaña no
  -- puede empezar un conteo nuevo y perder lo escaneado.
  SELECT * INTO v_session
    FROM public.stock_count_sessions
   WHERE branch_id = v_branch_id AND status = 'OPEN'
   LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object('ok', true, 'sessionId', v_session.id,
                              'yaAbierta', true,
                              'openedAt', v_session.opened_at,
                              'openedBy', v_session.opened_by);
  END IF;

  INSERT INTO public.stock_count_sessions (branch_id, opened_by, zeroed_on_open)
       VALUES (v_branch_id, p_opened_by, COALESCE(p_zero_now, false))
    RETURNING * INTO v_session;

  IF COALESCE(p_zero_now, false) THEN
    -- Movimiento por cada producto que tenía stock, para que el conteo
    -- quede auditable: se ve qué había antes de arrancar de cero.
    --
    -- El signo se resuelve acá: el POS permite vender sin stock, así que hay
    -- filas en negativo (deuda de stock). Llevar un -1 a cero es una ENTRADA,
    -- y `inventory_movements.quantity` tiene CHECK > 0.
    INSERT INTO public.inventory_movements (
      product_barcode, type, quantity, reason, reference_id, branch_id
    )
    SELECT bs.product_barcode,
           CASE WHEN bs.stock > 0 THEN 'OUT'::movement_type ELSE 'IN'::movement_type END,
           abs(bs.stock),
           'STOCK_COUNT_RESET', v_session.id::text, v_branch_id
      FROM public.branch_stock bs
     WHERE bs.branch_id = v_branch_id AND bs.stock <> 0;

    UPDATE public.branch_stock
       SET stock = 0, updated_at = now()
     WHERE branch_id = v_branch_id AND stock <> 0;

    GET DIAGNOSTICS v_puestos = ROW_COUNT;
  END IF;

  RETURN jsonb_build_object('ok', true, 'sessionId', v_session.id,
                            'yaAbierta', false,
                            'openedAt', v_session.opened_at,
                            'puestosEnCero', v_puestos);
END;
$$;

-- Estado del conteo: cuánto se contó, cuánto falta y qué diferencia
-- acumulada lleva contra lo que el sistema creía.
CREATE OR REPLACE FUNCTION public.stock_count_progress(p_session_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_session public.stock_count_sessions;
  v_res     jsonb;
BEGIN
  SELECT * INTO v_session FROM public.stock_count_sessions WHERE id = p_session_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'La sesión de conteo no existe');
  END IF;

  SELECT jsonb_build_object(
    'ok', true,
    'sessionId', v_session.id,
    'status', v_session.status,
    'branchId', v_session.branch_id,
    'openedAt', v_session.opened_at,
    'openedBy', v_session.opened_by,
    'contados', (SELECT count(*) FROM public.stock_count_entries e
                  WHERE e.session_id = v_session.id),
    'unidades', (SELECT COALESCE(SUM(e.counted_qty), 0) FROM public.stock_count_entries e
                  WHERE e.session_id = v_session.id),
    'conDiferencia', (SELECT count(*) FROM public.stock_count_entries e
                       WHERE e.session_id = v_session.id
                         AND e.counted_qty <> e.system_qty),
    'diferenciaNeta', (SELECT COALESCE(SUM(e.counted_qty - e.system_qty), 0)
                         FROM public.stock_count_entries e
                        WHERE e.session_id = v_session.id),
    'enCero', (SELECT count(*) FROM public.stock_count_entries e
                WHERE e.session_id = v_session.id AND e.counted_qty = 0),
    -- Activos que nunca se escanearon: son los que el cierre apagaría.
    'pendientes', (SELECT count(*) FROM public.products p
                    WHERE COALESCE(p.is_active, true) = true
                      AND NOT EXISTS (SELECT 1 FROM public.stock_count_entries e
                                       WHERE e.session_id = v_session.id
                                         AND e.product_barcode = p.barcode)),
    'totalCatalogo', (SELECT count(*) FROM public.products)
  ) INTO v_res;

  RETURN v_res;
END;
$$;

CREATE OR REPLACE FUNCTION public.close_stock_count(
  p_session_id           uuid,
  p_closed_by            text DEFAULT NULL,
  p_zero_uncounted       boolean DEFAULT true,
  p_deactivate_uncounted boolean DEFAULT true
) RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_session      public.stock_count_sessions;
  v_en_cero      integer := 0;
  v_desactivados integer := 0;
  v_contados     integer := 0;
BEGIN
  SELECT * INTO v_session
    FROM public.stock_count_sessions
   WHERE id = p_session_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'La sesión de conteo no existe');
  END IF;
  IF v_session.status <> 'OPEN' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'El conteo ya estaba cerrado');
  END IF;

  -- "No contados" = productos activos sin entrada en esta sesión. Se
  -- resuelve como subconsulta en cada statement en vez de una tabla temporal
  -- (una temp table dentro de una función revienta si la misma transacción
  -- llama a la función dos veces). El conjunto no se mueve entre statements:
  -- depende de `products.is_active` y de las entradas, y el único statement
  -- que toca `is_active` de los no contados es el segundo.

  IF COALESCE(p_zero_uncounted, true) THEN
    INSERT INTO public.inventory_movements (
      product_barcode, type, quantity, reason, reference_id, branch_id
    )
    SELECT bs.product_barcode,
           -- Mismo criterio de signo que en open_stock_count.
           CASE WHEN bs.stock > 0 THEN 'OUT'::movement_type ELSE 'IN'::movement_type END,
           abs(bs.stock),
           'STOCK_COUNT_MISSING', v_session.id::text, v_session.branch_id
      FROM public.branch_stock bs
      JOIN public.products p ON p.barcode = bs.product_barcode
     WHERE bs.branch_id = v_session.branch_id
       AND bs.stock <> 0
       AND COALESCE(p.is_active, true) = true
       AND NOT EXISTS (SELECT 1 FROM public.stock_count_entries e
                        WHERE e.session_id = v_session.id
                          AND e.product_barcode = bs.product_barcode);

    UPDATE public.branch_stock bs
       SET stock = 0, updated_at = now()
      FROM public.products p
     WHERE p.barcode = bs.product_barcode
       AND bs.branch_id = v_session.branch_id
       AND bs.stock <> 0
       AND COALESCE(p.is_active, true) = true
       AND NOT EXISTS (SELECT 1 FROM public.stock_count_entries e
                        WHERE e.session_id = v_session.id
                          AND e.product_barcode = bs.product_barcode);

    GET DIAGNOSTICS v_en_cero = ROW_COUNT;
  END IF;

  IF COALESCE(p_deactivate_uncounted, true) THEN
    UPDATE public.products p
       SET is_active = false, verified_at = NULL
     WHERE COALESCE(p.is_active, true) = true
       AND NOT EXISTS (SELECT 1 FROM public.stock_count_entries e
                        WHERE e.session_id = v_session.id
                          AND e.product_barcode = p.barcode);

    GET DIAGNOSTICS v_desactivados = ROW_COUNT;
  END IF;

  -- Contado con existencias → disponible; contado en cero → sigue en el
  -- catálogo pero no disponible hasta que vuelva a haber.
  UPDATE public.products p
     SET is_active   = (e.counted_qty > 0),
         verified_at = CASE WHEN e.counted_qty > 0 THEN now() ELSE NULL END,
         verified_by = COALESCE(p_closed_by, p.verified_by)
    FROM public.stock_count_entries e
   WHERE e.session_id = v_session.id
     AND p.barcode = e.product_barcode;

  GET DIAGNOSTICS v_contados = ROW_COUNT;

  UPDATE public.stock_count_sessions
     SET status = 'CLOSED', closed_at = now(), closed_by = p_closed_by
   WHERE id = v_session.id;

  RETURN jsonb_build_object(
    'ok', true,
    'contados', v_contados,
    'puestosEnCero', v_en_cero,
    'desactivados', v_desactivados
  );
END;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 5. Un solo escritor de products.stock: fuera el trigger de movimientos
-- ─────────────────────────────────────────────────────────────────────
--
-- `update_stock_on_movement` hacía `products.stock = stock ± quantity` en
-- cada INSERT de `inventory_movements`, en paralelo al derivado. Ninguna
-- función de la app inserta movimientos sin mover también `branch_stock`
-- (se verificó en los dos repos), así que sacarlo no cambia ningún
-- resultado hoy: sólo deja de haber una segunda fórmula compitiendo.

DROP TRIGGER IF EXISTS tr_inventory_movement_stock ON public.inventory_movements;
DROP FUNCTION IF EXISTS public.update_stock_on_movement();

-- ─────────────────────────────────────────────────────────────────────
-- 6. Recepción idempotente, y sin recalcular products.stock a mano
-- ─────────────────────────────────────────────────────────────────────
--
-- Se reemplaza la firma para agregar `p_op_id` en vez de crear una
-- sobrecarga: dos `apply_reception` con distinta aridad es exactamente el
-- problema que hoy tiene `apply_sale` (PostgREST no puede elegir candidato
-- y falla en tiempo de ejecución). Con `p_op_id` por defecto NULL, quien
-- siga llamando con cuatro parámetros nombrados sigue funcionando igual.

DROP FUNCTION IF EXISTS public.apply_reception(jsonb, uuid, text, text);

CREATE OR REPLACE FUNCTION public.apply_reception(
  p_items     jsonb,
  p_branch_id uuid DEFAULT NULL,
  p_reference text DEFAULT NULL,
  p_notes     text DEFAULT NULL,
  p_op_id     text DEFAULT NULL
) RETURNS integer
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_item      jsonb;
  v_barcode   text;
  v_qty       numeric;
  v_branch_id uuid;
  v_count     integer := 0;
BEGIN
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RETURN 0;
  END IF;

  v_branch_id := COALESCE(
    p_branch_id,
    (SELECT id FROM public.branches WHERE is_default = true LIMIT 1)
  );

  -- Reintento del outbox de una recepción que sí había entrado: no se suma
  -- de nuevo. Se responde 0 ítems, que es lo que efectivamente se movió.
  IF NOT public.stock_op_reservar(p_op_id, 'RECEPTION', v_branch_id,
                                  jsonb_array_length(p_items)) THEN
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
       SET stock = stock + v_qty, updated_at = now()
     WHERE branch_id = v_branch_id AND product_barcode = v_barcode;

    -- products.stock lo pone el trigger branch_stock_sync_products.

    INSERT INTO public.inventory_movements (
      product_barcode, type, quantity, reason, reference_id, branch_id
    ) VALUES (
      v_barcode, 'IN', v_qty,
      COALESCE(p_notes, 'RECEPTION'),
      COALESCE(p_reference, p_op_id), v_branch_id
    );

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION public.apply_reception(jsonb, uuid, text, text, text) IS
  'Entrada de mercaderia: suma a branch_stock y registra movimientos IN. Idempotente por p_op_id — un reintento del outbox no duplica la recepcion.';

-- apply_reception_reverse e increment_product_stock: se les saca el
-- recálculo manual de products.stock (la suma sin filtrar sucursal activa).
-- El resto del cuerpo queda igual.

CREATE OR REPLACE FUNCTION public.apply_reception_reverse(
  p_items     jsonb,
  p_branch_id uuid DEFAULT NULL,
  p_reference text DEFAULT NULL,
  p_notes     text DEFAULT NULL
) RETURNS integer
LANGUAGE plpgsql
SET search_path = public, pg_temp
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

    INSERT INTO public.inventory_movements (
      product_barcode, type, quantity, reason, reference_id, branch_id
    ) VALUES (
      v_barcode, 'OUT', v_qty,
      COALESCE(p_notes, 'RECEPTION_REVERSE'),
      p_reference, v_branch_id
    );

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_product_stock(
  p_barcode   text,
  p_quantity  numeric,
  p_branch_id uuid DEFAULT NULL,
  p_reference text DEFAULT NULL,
  p_reason    text DEFAULT 'WEB_SALE_ROLLBACK'
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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

  INSERT INTO public.inventory_movements (
    product_barcode, type, quantity, reason, reference_id, branch_id
  ) VALUES (
    p_barcode, 'IN', p_quantity, COALESCE(p_reason, 'WEB_SALE_ROLLBACK'),
    p_reference, v_branch_id
  );
END;
$$;

-- Traspaso: mismo tratamiento — idempotencia por op_id y sin recálculo a mano.
DROP FUNCTION IF EXISTS public.apply_transfer(jsonb, uuid, uuid, text, text, text);

CREATE OR REPLACE FUNCTION public.apply_transfer(
  p_items          jsonb,
  p_from_branch_id uuid,
  p_to_branch_id   uuid,
  p_reference      text DEFAULT NULL,
  p_notes          text DEFAULT NULL,
  p_device_id      text DEFAULT NULL,
  p_op_id          text DEFAULT NULL
) RETURNS text
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_transfer_id text := 'TRF-' || to_char(now(), 'YYYYMMDDHH24MISS') || '-' || substr(md5(random()::text), 1, 6);
  v_item        jsonb;
  v_barcode     text;
  v_qty         numeric;
BEGIN
  IF p_from_branch_id IS NULL OR p_to_branch_id IS NULL THEN
    RAISE EXCEPTION 'Se requiere sucursal de origen y destino';
  END IF;
  IF p_from_branch_id = p_to_branch_id THEN
    RAISE EXCEPTION 'La sucursal de origen y destino no pueden ser la misma';
  END IF;

  IF NOT public.stock_op_reservar(p_op_id, 'TRANSFER', p_to_branch_id,
                                  COALESCE(jsonb_array_length(p_items), 0)) THEN
    RETURN 'YA_APLICADO';
  END IF;

  IF p_items IS NOT NULL AND jsonb_array_length(p_items) > 0 THEN
    FOR v_item IN SELECT jsonb_array_elements(p_items) LOOP
      v_barcode := v_item->>'barcode';
      v_qty     := COALESCE((v_item->>'qty')::numeric, 0);
      IF v_qty <= 0 THEN CONTINUE; END IF;

      -- Descontar en origen (nunca negativo: mismo criterio que apply_sale)
      INSERT INTO public.branch_stock (branch_id, product_barcode, stock)
           VALUES (p_from_branch_id, v_barcode, 0)
       ON CONFLICT (branch_id, product_barcode) DO NOTHING;
      UPDATE public.branch_stock
         SET stock = GREATEST(0, stock - v_qty), updated_at = now()
       WHERE branch_id = p_from_branch_id AND product_barcode = v_barcode;

      -- Sumar en destino
      INSERT INTO public.branch_stock (branch_id, product_barcode, stock)
           VALUES (p_to_branch_id, v_barcode, 0)
       ON CONFLICT (branch_id, product_barcode) DO NOTHING;
      UPDATE public.branch_stock
         SET stock = stock + v_qty, updated_at = now()
       WHERE branch_id = p_to_branch_id AND product_barcode = v_barcode;

      -- Auditoría: dos movimientos enlazados por el mismo reference_id
      INSERT INTO public.inventory_movements (product_barcode, type, quantity, reason, reference_id, branch_id)
           VALUES (v_barcode, 'OUT', v_qty, 'TRANSFER_OUT', v_transfer_id, p_from_branch_id);
      INSERT INTO public.inventory_movements (product_barcode, type, quantity, reason, reference_id, branch_id)
           VALUES (v_barcode, 'IN', v_qty, 'TRANSFER_IN', v_transfer_id, p_to_branch_id);
    END LOOP;
  END IF;

  RETURN v_transfer_id;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 7. Permisos (doctrina #7: revocar de PUBLIC, no sólo de anon)
-- ─────────────────────────────────────────────────────────────────────

REVOKE ALL ON FUNCTION public.stock_op_reservar(text, text, uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.stock_op_reservar(text, text, uuid, integer) TO service_role;

REVOKE ALL ON FUNCTION public.apply_stock_absolute(jsonb, uuid, text, text, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_stock_absolute(jsonb, uuid, text, text, uuid, text) TO service_role;

REVOKE ALL ON FUNCTION public.open_stock_count(uuid, text, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.open_stock_count(uuid, text, boolean) TO service_role;

REVOKE ALL ON FUNCTION public.stock_count_progress(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.stock_count_progress(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.close_stock_count(uuid, text, boolean, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.close_stock_count(uuid, text, boolean, boolean) TO service_role;

REVOKE ALL ON FUNCTION public.apply_reception(jsonb, uuid, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_reception(jsonb, uuid, text, text, text) TO service_role;

REVOKE ALL ON FUNCTION public.apply_reception_reverse(jsonb, uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_reception_reverse(jsonb, uuid, text, text) TO service_role;

REVOKE ALL ON FUNCTION public.apply_transfer(jsonb, uuid, uuid, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_transfer(jsonb, uuid, uuid, text, text, text, text) TO service_role;

REVOKE ALL ON FUNCTION public.increment_product_stock(text, numeric, uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_product_stock(text, numeric, uuid, text, text) TO service_role;

-- ─────────────────────────────────────────────────────────────────────
-- 8. Sucursal 2: filas en cero de una sucursal inactiva
-- ─────────────────────────────────────────────────────────────────────
--
-- Quedaron 646 filas en `branch_stock` de "Sucursal 2" (inactiva, todas en
-- 0) del resync de julio. Hoy no suman porque `stock_derivado` filtra por
-- sucursal activa, pero si alguien la reactiva el stock se duplica en el
-- acto — que es exactamente cómo se rompió en agosto. Se borran las que
-- están en cero; si alguna tuviera stock real no se toca.

DELETE FROM public.branch_stock bs
 USING public.branches b
 WHERE b.id = bs.branch_id
   AND b.is_active = false
   AND bs.stock = 0;
