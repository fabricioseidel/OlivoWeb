-- =====================================================================
-- 20260912000000_conteo_suma_por_lugar.sql
--
-- Un producto se puede contar en varios lugares y el conteo los SUMA.
--
-- QUÉ SE ROMPIÓ, MEDIDO EL 12/09/2026
--
-- El primer inventario real (sesión 2be08c08, 11-sep 21:41 a 12-sep 00:59)
-- se hizo en dos recorridos: primero la vitrina y la sala, después la
-- bodega. Los mismos productos estaban en los dos lugares.
--
-- `stock_count_entries` tiene PK (session_id, product_barcode) y el upsert
-- hacía `counted_qty = EXCLUDED.counted_qty`: el segundo conteo de un
-- producto REEMPLAZABA al primero en vez de sumarlo. De 487 ítems enviados
-- en 9 lotes quedaron 366 productos: 121 conteos se perdieron, y con ellos
-- lo que había en vitrina de 120 productos.
--
-- Nunca deja stock de más —el último conteo gana, no se duplica— pero deja
-- stock de menos, que para la tienda web es igual de caro: ofrece 3 cuando
-- hay 7 y el cliente se lleva menos de lo que hay.
--
-- Las cantidades perdidas no se pueden recuperar: la fila se sobreescribió
-- y los logs de Postgres de este proyecto no guardan sentencias. Lo que sí
-- quedó es el reparto por lote, y con eso se puede saber exactamente qué
-- 170 productos terminaron con el número de la bodega (`stock_ops` +
-- `counted_at`). Esa lista se entregó aparte para revisar la vitrina.
--
-- CÓMO QUEDA
--
-- Cada escaneo guardado es una MARCA (`stock_count_tags`), append-only, como
-- las tarjetas de un inventario de papel: una por lugar recorrido. Lo
-- contado de un producto es la suma de sus marcas.
--
-- `stock_count_entries` sigue existiendo como el acumulado por producto
-- (`counted_qty` = suma de marcas), así que el cierre y el avance no
-- cambian de forma. Lo que cambia es `system_qty`: ahora se captura en la
-- PRIMERA marca y no se refresca, porque el total se construye a lo largo
-- del recorrido y la corrección por ventas tiene que medirse desde que ese
-- producto empezó a contarse.
--
-- Para arreglar un error de tipeo hay `replace`: borra las marcas previas
-- de ese producto y deja sólo la nueva. Es explícito, porque adivinar entre
-- "me equivoqué" y "lo conté en otro lugar" es justo lo que salió mal.
--
-- Efecto lateral bueno: sumar no necesita saber el total previo, así que el
-- conteo sin conexión queda correcto sin consultar nada.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.stock_count_tags (
  id              bigserial PRIMARY KEY,
  session_id      uuid NOT NULL REFERENCES public.stock_count_sessions(id) ON DELETE CASCADE,
  product_barcode text NOT NULL REFERENCES public.products(barcode) ON DELETE CASCADE,
  qty             numeric NOT NULL CHECK (qty >= 0),
  /** Lote (`stock_ops.op_id`) que trajo esta marca. */
  op_id           text,
  counted_at      timestamptz NOT NULL DEFAULT now(),
  counted_by      text
);

COMMENT ON TABLE public.stock_count_tags IS
  'Cada escaneo guardado de un conteo, append-only: una marca por lugar recorrido. Lo contado de un producto es la suma de sus marcas (stock_count_entries.counted_qty).';

CREATE INDEX IF NOT EXISTS idx_stock_count_tags_producto
  ON public.stock_count_tags (session_id, product_barcode);

ALTER TABLE public.stock_count_tags ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'stock_count_tags'
       AND policyname = 'stock_count_tags_all_service'
  ) THEN
    CREATE POLICY "stock_count_tags_all_service" ON public.stock_count_tags
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

COMMENT ON COLUMN public.stock_count_entries.counted_qty IS
  'Acumulado de lo contado: suma de las marcas (stock_count_tags) de este producto en esta sesion.';

COMMENT ON COLUMN public.stock_count_entries.system_qty IS
  'Stock de la sucursal cuando este producto se conto por PRIMERA vez en la sesion. No se refresca: es la base desde la que el cierre corrige las ventas y recepciones posteriores.';

-- Marcas de la sesión del 11/09, reconstruidas desde el acumulado que quedó.
-- No recupera los 121 conteos sobreescritos (esos números no existen en
-- ninguna parte); sólo deja la sesión vieja coherente con el modelo nuevo.
INSERT INTO public.stock_count_tags (session_id, product_barcode, qty, counted_at, counted_by)
SELECT e.session_id, e.product_barcode, e.counted_qty, e.counted_at, e.counted_by
  FROM public.stock_count_entries e
 WHERE NOT EXISTS (
   SELECT 1 FROM public.stock_count_tags t
    WHERE t.session_id = e.session_id
      AND t.product_barcode = e.product_barcode
 );

-- ─────────────────────────────────────────────────────────────────────
-- Contar: cada ítem deja una marca y el acumulado se recalcula
-- ─────────────────────────────────────────────────────────────────────
--
-- `p_items`: [{ "barcode": "...", "qty": 5, "replace": false }]
--
--   qty        cantidad vista en ESTE lugar. 0 es válido: "acá no hay".
--   replace    true borra lo contado antes de este producto en la sesión y
--              empieza de nuevo con `qty`. Para corregir un error, no para
--              contar otro lugar.
--
-- Sin sesión (`p_session_id` NULL) sigue siendo un ajuste absoluto directo:
-- es lo que usa el editor de productos del mostrador y del panel.

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
  v_replace      boolean;
  v_actual       numeric;
  v_delta        numeric;
  v_branch_id    uuid;
  v_session      public.stock_count_sessions;
  v_solo_anota   boolean := false;
  v_primera      boolean;
  v_total_previo numeric;
  v_total        numeric;
  v_destino      numeric;
  v_aplicados    integer := 0;
  v_ajustados    integer := 0;
  v_sumados      integer := 0;
  v_desconocidos text[] := '{}';
  v_reason       text := COALESCE(NULLIF(btrim(p_reason), ''), 'STOCK_COUNT');
BEGIN
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'No hay ítems');
  END IF;

  IF p_session_id IS NOT NULL THEN
    SELECT * INTO v_session FROM public.stock_count_sessions WHERE id = p_session_id;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'error', 'La sesión de conteo no existe');
    END IF;
    IF v_session.status <> 'OPEN' THEN
      RETURN jsonb_build_object('ok', false, 'error', 'El conteo ya está cerrado');
    END IF;
    v_branch_id  := v_session.branch_id;
    v_solo_anota := v_session.apply_mode = 'ON_CLOSE';
  END IF;

  v_branch_id := COALESCE(
    v_branch_id,
    p_branch_id,
    (SELECT id FROM public.branches WHERE is_default = true LIMIT 1)
  );
  IF v_branch_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'No hay sucursal configurada');
  END IF;

  IF NOT public.stock_op_reservar(p_op_id, 'STOCK_ABSOLUTE', v_branch_id,
                                  jsonb_array_length(p_items)) THEN
    RETURN jsonb_build_object('ok', true, 'yaAplicada', true, 'aplicados', 0,
                              'ajustados', 0, 'sumados', 0, 'soloAnotado', v_solo_anota);
  END IF;

  FOR v_item IN SELECT jsonb_array_elements(p_items) LOOP
    v_barcode := btrim(COALESCE(v_item->>'barcode', ''));
    v_qty     := COALESCE((v_item->>'qty')::numeric, -1);
    v_replace := COALESCE((v_item->>'replace')::boolean, false);

    IF v_barcode = '' OR v_qty < 0 THEN CONTINUE; END IF;

    IF NOT EXISTS (SELECT 1 FROM public.products WHERE barcode = v_barcode) THEN
      v_desconocidos := v_desconocidos || v_barcode;
      CONTINUE;
    END IF;

    INSERT INTO public.branch_stock (branch_id, product_barcode, stock)
         VALUES (v_branch_id, v_barcode, 0)
     ON CONFLICT (branch_id, product_barcode) DO NOTHING;

    -- Sin sesión el comportamiento es el de siempre: fijar la cantidad.
    IF p_session_id IS NULL THEN
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
          abs(v_delta), v_reason, p_op_id, v_branch_id
        );

        v_ajustados := v_ajustados + 1;
      END IF;

      IF v_qty > 0 THEN
        UPDATE public.products
           SET is_active   = true,
               verified_at = now(),
               verified_by = COALESCE(p_counted_by, verified_by)
         WHERE barcode = v_barcode
           AND (is_active IS DISTINCT FROM true OR verified_at IS NULL);
      END IF;

      v_aplicados := v_aplicados + 1;
      CONTINUE;
    END IF;

    -- ── Con sesión: se acumula por marcas ──────────────────────────
    IF v_replace THEN
      DELETE FROM public.stock_count_tags
       WHERE session_id = p_session_id AND product_barcode = v_barcode;
    END IF;

    SELECT COALESCE(SUM(qty), 0), count(*) = 0
      INTO v_total_previo, v_primera
      FROM public.stock_count_tags
     WHERE session_id = p_session_id AND product_barcode = v_barcode;

    INSERT INTO public.stock_count_tags (
      session_id, product_barcode, qty, op_id, counted_by
    ) VALUES (
      p_session_id, v_barcode, v_qty, p_op_id, p_counted_by
    );

    v_total := v_total_previo + v_qty;
    IF NOT v_primera THEN
      v_sumados := v_sumados + 1;
    END IF;

    -- El acumulado. `system_qty` sólo se fija en la primera marca: es la
    -- base desde la que el cierre corrige las ventas posteriores.
    SELECT stock INTO v_actual
      FROM public.branch_stock
     WHERE branch_id = v_branch_id AND product_barcode = v_barcode;
    v_actual := COALESCE(v_actual, 0);

    INSERT INTO public.stock_count_entries (
      session_id, product_barcode, counted_qty, system_qty, counted_by
    ) VALUES (
      p_session_id, v_barcode, v_total, v_actual, p_counted_by
    )
    ON CONFLICT (session_id, product_barcode) DO UPDATE
      SET counted_qty = v_total,
          system_qty  = CASE WHEN v_primera THEN v_actual
                             ELSE stock_count_entries.system_qty END,
          counted_at  = now(),
          counted_by  = EXCLUDED.counted_by;

    -- En modo borrador no se toca el stock ni el catálogo: todo al cerrar.
    IF NOT v_solo_anota THEN
      -- La primera marca fija el valor; las siguientes mueven la diferencia,
      -- para no borrar una venta ocurrida entre dos lugares del recorrido.
      v_destino := CASE WHEN v_primera THEN v_qty
                        ELSE v_actual + (v_total - v_total_previo) END;
      v_destino := GREATEST(v_destino, 0);
      v_delta   := v_destino - v_actual;

      IF v_delta <> 0 THEN
        UPDATE public.branch_stock
           SET stock = v_destino, updated_at = now()
         WHERE branch_id = v_branch_id AND product_barcode = v_barcode;

        INSERT INTO public.inventory_movements (
          product_barcode, type, quantity, reason, reference_id, branch_id
        ) VALUES (
          v_barcode,
          CASE WHEN v_delta > 0 THEN 'IN'::movement_type ELSE 'OUT'::movement_type END,
          abs(v_delta), v_reason, p_session_id::text, v_branch_id
        );

        v_ajustados := v_ajustados + 1;
      END IF;

      IF v_total > 0 THEN
        UPDATE public.products
           SET is_active   = true,
               verified_at = now(),
               verified_by = COALESCE(p_counted_by, verified_by)
         WHERE barcode = v_barcode
           AND (is_active IS DISTINCT FROM true OR verified_at IS NULL);
      END IF;
    END IF;

    v_aplicados := v_aplicados + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'aplicados', v_aplicados,
    'ajustados', v_ajustados,
    /** Productos que ya se habían contado antes en esta sesión: se sumaron. */
    'sumados', v_sumados,
    'soloAnotado', v_solo_anota,
    'desconocidos', to_jsonb(v_desconocidos)
  );
END;
$$;

COMMENT ON FUNCTION public.apply_stock_absolute(jsonb, uuid, text, text, uuid, text) IS
  'Registra lo contado. Con sesion, cada item deja una marca y lo contado del producto es la suma de sus marcas (contar el mismo producto en vitrina y bodega SUMA); "replace": true reinicia ese producto. Sin sesion fija la cantidad exacta (ajuste manual). Idempotente por p_op_id.';

-- ─────────────────────────────────────────────────────────────────────
-- Avance: cuántos productos se contaron en más de un lugar
-- ─────────────────────────────────────────────────────────────────────

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
    'applyMode', v_session.apply_mode,
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
    'marcas', (SELECT count(*) FROM public.stock_count_tags t
                WHERE t.session_id = v_session.id),
    -- Productos vistos en más de un lugar. Antes cada uno de estos era un
    -- conteo perdido; ahora es una suma.
    'enVariosLugares', (
      SELECT count(*) FROM (
        SELECT t.product_barcode
          FROM public.stock_count_tags t
         WHERE t.session_id = v_session.id
         GROUP BY t.product_barcode
        HAVING count(*) > 1
      ) q
    ),
    'movidosDesdeElConteo', (
      SELECT count(*)
        FROM public.stock_count_entries e
        LEFT JOIN public.branch_stock bs
               ON bs.product_barcode = e.product_barcode
              AND bs.branch_id = v_session.branch_id
       WHERE e.session_id = v_session.id
         AND COALESCE(bs.stock, 0) <> e.system_qty
    ),
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

-- ─────────────────────────────────────────────────────────────────────
-- Cuánto lleva contado un producto en la sesión abierta
-- ─────────────────────────────────────────────────────────────────────
--
-- Lo usa el mostrador para avisar "ya contaste 3 de esto acá" antes de sumar
-- otro lugar, y para ofrecer corregir en vez de sumar. Es informativo: sumar
-- no necesita este dato, que es lo que deja el conteo funcionando sin red.

CREATE OR REPLACE FUNCTION public.stock_count_product(
  p_session_id uuid,
  p_barcode    text
) RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT jsonb_build_object(
    'ok', true,
    'barcode', p_barcode,
    'contado', COALESCE((SELECT SUM(qty) FROM public.stock_count_tags
                          WHERE session_id = p_session_id
                            AND product_barcode = p_barcode), 0),
    'marcas', (SELECT count(*) FROM public.stock_count_tags
                WHERE session_id = p_session_id
                  AND product_barcode = p_barcode)
  );
$$;

REVOKE ALL ON FUNCTION public.apply_stock_absolute(jsonb, uuid, text, text, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_stock_absolute(jsonb, uuid, text, text, uuid, text) TO service_role;

REVOKE ALL ON FUNCTION public.stock_count_progress(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.stock_count_progress(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.stock_count_product(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.stock_count_product(uuid, text) TO service_role;
