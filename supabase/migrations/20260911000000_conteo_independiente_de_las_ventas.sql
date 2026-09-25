-- =====================================================================
-- 20260911000000_conteo_independiente_de_las_ventas.sql
--
-- El conteo pasa a ser un BORRADOR que no toca el stock hasta que se cierra.
--
-- POR QUÉ
--
-- Como quedó ayer, cada lote escaneado fijaba el stock en el momento. Eso
-- obliga a contar con la tienda cerrada: si alguien vende una de las 8
-- unidades que acabás de contar, el número que dejó el conteo ya está viejo, y
-- si contás por la mañana y cerrás por la tarde, el conteo "gana" contra todas
-- las ventas del día — las borra.
--
-- Ahora el conteo anota y no escribe. Todo se aplica de una vez al cerrar, y
-- ahí se corrige lo que se movió mientras se contaba.
--
-- CÓMO SE CORRIGE
--
-- Cada entrada guarda, además de lo contado, cuánto decía el sistema en ese
-- momento (`system_qty`). Al cerrar:
--
--     final = contado + (stock_de_ahora − stock_cuando_se_contó)
--
-- El paréntesis es exactamente lo que pasó después del conteo: las ventas
-- (negativo) y las recepciones (positivo) de ese producto. No hace falta leer
-- `inventory_movements` para saberlo, porque `branch_stock` sólo cambia por
-- esos movimientos: el propio stock lleva la cuenta.
--
-- Ejemplo: contaste 8 a las 10:00 (el sistema decía 6). Durante el día se
-- vendieron 3 → el stock de ahora es 3. Al cerrar queda 8 + (3 − 6) = 5, que
-- es lo correcto: había 8, se vendieron 3. Sin la corrección quedaría 8, y las
-- tres ventas del día desaparecerían del inventario.
--
-- Se contempla el recuento: si un producto se vuelve a contar, `system_qty` se
-- refresca al stock de ese momento, así la corrección mide desde el último
-- conteo y no desde el primero.
--
-- MODOS
--
-- `stock_count_sessions.apply_mode`:
--   'ON_CLOSE' (por defecto) — borrador, se aplica al cerrar. Es el modo para
--       contar con la tienda abierta.
--   'LIVE' — fija el stock en cada lote, como quedó ayer. Sirve para recontar
--       un par de productos con la tienda cerrada y verlos corregidos ya.
-- =====================================================================

ALTER TABLE public.stock_count_sessions
  ADD COLUMN IF NOT EXISTS apply_mode text NOT NULL DEFAULT 'ON_CLOSE';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'stock_count_sessions_apply_mode_check'
  ) THEN
    ALTER TABLE public.stock_count_sessions
      ADD CONSTRAINT stock_count_sessions_apply_mode_check
      CHECK (apply_mode IN ('ON_CLOSE', 'LIVE'));
  END IF;
END $$;

COMMENT ON COLUMN public.stock_count_sessions.apply_mode IS
  'ON_CLOSE: el conteo es un borrador y se aplica al cerrar, corrigiendo las ventas del medio. LIVE: cada lote fija el stock en el momento.';

COMMENT ON COLUMN public.stock_count_entries.system_qty IS
  'Stock de la sucursal en el momento en que se contó (se refresca si se recuenta). Sirve para dos cosas: la diferencia que encontró el conteo, y la correccion por lo que se vendio o recibio despues.';

-- ─────────────────────────────────────────────────────────────────────
-- Abrir: el modo se elige acá y no se puede cambiar a mitad de camino
-- ─────────────────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.open_stock_count(uuid, text, boolean);

CREATE OR REPLACE FUNCTION public.open_stock_count(
  p_branch_id  uuid DEFAULT NULL,
  p_opened_by  text DEFAULT NULL,
  p_zero_now   boolean DEFAULT false,
  p_apply_mode text DEFAULT 'ON_CLOSE'
) RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_branch_id uuid;
  v_session   public.stock_count_sessions;
  v_puestos   integer := 0;
  v_mode      text := COALESCE(NULLIF(btrim(p_apply_mode), ''), 'ON_CLOSE');
BEGIN
  IF v_mode NOT IN ('ON_CLOSE', 'LIVE') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Modo de conteo inválido');
  END IF;

  v_branch_id := COALESCE(
    p_branch_id,
    (SELECT id FROM public.branches WHERE is_default = true LIMIT 1)
  );
  IF v_branch_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'No hay sucursal configurada');
  END IF;

  -- Poner todo en cero es lo contrario de un conteo independiente: deja la
  -- tienda sin stock justo mientras sigue vendiendo. Sólo se permite en LIVE,
  -- que es el modo de contar con la tienda cerrada.
  IF COALESCE(p_zero_now, false) AND v_mode <> 'LIVE' THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Poner el stock en cero sólo se puede en un conteo que se aplica al instante'
    );
  END IF;

  SELECT * INTO v_session
    FROM public.stock_count_sessions
   WHERE branch_id = v_branch_id AND status = 'OPEN'
   LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object('ok', true, 'sessionId', v_session.id,
                              'yaAbierta', true,
                              'applyMode', v_session.apply_mode,
                              'openedAt', v_session.opened_at,
                              'openedBy', v_session.opened_by);
  END IF;

  INSERT INTO public.stock_count_sessions (branch_id, opened_by, zeroed_on_open, apply_mode)
       VALUES (v_branch_id, p_opened_by, COALESCE(p_zero_now, false), v_mode)
    RETURNING * INTO v_session;

  IF COALESCE(p_zero_now, false) THEN
    -- Movimiento por cada producto que tenía stock, para que el conteo quede
    -- auditable: se ve qué había antes de arrancar de cero. El signo se
    -- resuelve acá porque hay filas en negativo (el POS permite vender sin
    -- stock) y `inventory_movements.quantity` tiene CHECK > 0.
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
                            'applyMode', v_session.apply_mode,
                            'openedAt', v_session.opened_at,
                            'puestosEnCero', v_puestos);
END;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- Contar: en ON_CLOSE sólo anota; en LIVE escribe como antes
-- ─────────────────────────────────────────────────────────────────────

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
  v_session      public.stock_count_sessions;
  v_solo_anota   boolean := false;
  v_aplicados    integer := 0;
  v_ajustados    integer := 0;
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
    -- La sucursal la manda la sesión: contar en una y aplicar en otra no
    -- tendría sentido y es la clase de error que nadie nota hasta el cierre.
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

  -- Ya aplicada: no se vuelve a tocar nada. Se responde ok para que el outbox
  -- del cliente la dé por entregada y la saque de la cola.
  IF NOT public.stock_op_reservar(p_op_id, 'STOCK_ABSOLUTE', v_branch_id,
                                  jsonb_array_length(p_items)) THEN
    RETURN jsonb_build_object('ok', true, 'yaAplicada', true,
                              'aplicados', 0, 'ajustados', 0, 'soloAnotado', v_solo_anota);
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

    -- En modo borrador esto es sólo una lectura: no se bloquea la fila, que
    -- seguiría vendiéndose igual.
    IF v_solo_anota THEN
      SELECT stock INTO v_actual
        FROM public.branch_stock
       WHERE branch_id = v_branch_id AND product_barcode = v_barcode;
    ELSE
      SELECT stock INTO v_actual
        FROM public.branch_stock
       WHERE branch_id = v_branch_id AND product_barcode = v_barcode
         FOR UPDATE;
    END IF;

    v_actual := COALESCE(v_actual, 0);
    v_delta  := v_qty - v_actual;

    IF NOT v_solo_anota AND v_delta <> 0 THEN
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
            -- Se refresca a propósito: la corrección del cierre mide desde el
            -- último conteo de este producto, no desde el primero.
            system_qty  = EXCLUDED.system_qty,
            counted_at  = now(),
            counted_by  = EXCLUDED.counted_by;
    END IF;

    -- En modo borrador no se activa nada: el conteo no toca el catálogo hasta
    -- cerrarse. En LIVE, contado con existencias es vendible al instante.
    IF v_qty > 0 AND NOT v_solo_anota THEN
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
    'soloAnotado', v_solo_anota,
    'desconocidos', to_jsonb(v_desconocidos)
  );
END;
$$;

COMMENT ON FUNCTION public.apply_stock_absolute(jsonb, uuid, text, text, uuid, text) IS
  'Registra cantidades contadas. Con una sesion en ON_CLOSE solo las anota (el stock no se toca hasta cerrar); en LIVE, o sin sesion, fija el stock y deja el delta en inventory_movements. Idempotente por p_op_id.';

-- ─────────────────────────────────────────────────────────────────────
-- Cerrar: aplica el borrador corrigiendo lo que se movió mientras se contaba
-- ─────────────────────────────────────────────────────────────────────

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
  v_entry        record;
  v_actual       numeric;
  v_final        numeric;
  v_delta        numeric;
  v_aplicados    integer := 0;
  v_corregidos   integer := 0;
  v_en_negativo  integer := 0;
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

  -- 1) El borrador se aplica acá, producto por producto.
  --
  --        final = contado + (stock_de_ahora − stock_cuando_se_contó)
  --
  -- El paréntesis son las ventas y recepciones posteriores al conteo. La fila
  -- se bloquea antes de leerla, así una venta que entre justo en ese instante
  -- espera y se aplica sobre el valor nuevo en vez de perderse.
  IF v_session.apply_mode = 'ON_CLOSE' THEN
    FOR v_entry IN
      SELECT product_barcode, counted_qty, system_qty
        FROM public.stock_count_entries
       WHERE session_id = v_session.id
       ORDER BY product_barcode
    LOOP
      INSERT INTO public.branch_stock (branch_id, product_barcode, stock)
           VALUES (v_session.branch_id, v_entry.product_barcode, 0)
       ON CONFLICT (branch_id, product_barcode) DO NOTHING;

      SELECT stock INTO v_actual
        FROM public.branch_stock
       WHERE branch_id = v_session.branch_id
         AND product_barcode = v_entry.product_barcode
         FOR UPDATE;

      v_actual := COALESCE(v_actual, 0);
      v_final  := v_entry.counted_qty + (v_actual - v_entry.system_qty);

      IF v_actual <> v_entry.system_qty THEN
        v_corregidos := v_corregidos + 1;
      END IF;

      -- Se vendió más de lo que se contó: el conteo ya estaba viejo cuando se
      -- hizo. Queda en cero, que es lo cierto, y se informa cuántos pasaron.
      IF v_final < 0 THEN
        v_final := 0;
        v_en_negativo := v_en_negativo + 1;
      END IF;

      v_delta := v_final - v_actual;

      IF v_delta <> 0 THEN
        UPDATE public.branch_stock
           SET stock = v_final, updated_at = now()
         WHERE branch_id = v_session.branch_id
           AND product_barcode = v_entry.product_barcode;

        INSERT INTO public.inventory_movements (
          product_barcode, type, quantity, reason, reference_id, branch_id
        ) VALUES (
          v_entry.product_barcode,
          CASE WHEN v_delta > 0 THEN 'IN'::movement_type ELSE 'OUT'::movement_type END,
          abs(v_delta), 'STOCK_COUNT', v_session.id::text, v_session.branch_id
        );

        v_aplicados := v_aplicados + 1;
      END IF;
    END LOOP;
  END IF;

  -- 2) Lo que nunca se escaneó: queda en 0 y fuera del catálogo.
  IF COALESCE(p_zero_uncounted, true) THEN
    INSERT INTO public.inventory_movements (
      product_barcode, type, quantity, reason, reference_id, branch_id
    )
    SELECT bs.product_barcode,
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

  -- 3) Disponible = lo que quedó con existencias en la sucursal, ya corregido.
  --    Se mira el stock final y no lo contado: un producto contado en 8 que se
  --    vendió entero durante el conteo no está disponible, aunque se haya
  --    contado con existencias.
  UPDATE public.products p
     SET is_active   = COALESCE(bs.stock, 0) > 0,
         verified_at = CASE WHEN COALESCE(bs.stock, 0) > 0 THEN now() ELSE NULL END,
         verified_by = COALESCE(p_closed_by, p.verified_by)
    FROM public.stock_count_entries e
    LEFT JOIN public.branch_stock bs
           ON bs.product_barcode = e.product_barcode
          AND bs.branch_id = v_session.branch_id
   WHERE e.session_id = v_session.id
     AND p.barcode = e.product_barcode;

  GET DIAGNOSTICS v_contados = ROW_COUNT;

  UPDATE public.stock_count_sessions
     SET status = 'CLOSED', closed_at = now(), closed_by = p_closed_by
   WHERE id = v_session.id;

  RETURN jsonb_build_object(
    'ok', true,
    'applyMode', v_session.apply_mode,
    'contados', v_contados,
    /** Productos cuyo stock se escribió al cerrar (sólo en modo borrador). */
    'aplicados', v_aplicados,
    /** De esos, cuántos se corrigieron por ventas/recepciones del medio. */
    'corregidos', v_corregidos,
    /** Se vendió más de lo contado: quedaron en 0. Vale la pena revisarlos. */
    'enNegativo', v_en_negativo,
    'puestosEnCero', v_en_cero,
    'desactivados', v_desactivados
  );
END;
$$;

COMMENT ON FUNCTION public.close_stock_count(uuid, text, boolean, boolean) IS
  'Cierra el conteo. En modo ON_CLOSE aplica lo contado corrigiendo las ventas y recepciones ocurridas despues de cada conteo. Lo nunca contado queda en 0 y fuera del catalogo.';

-- ─────────────────────────────────────────────────────────────────────
-- Avance: además del progreso, la vista previa del pulido
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
    -- Vista previa de la corrección del cierre: productos que se movieron
    -- después de contarse. En un conteo con la tienda abierta es normal que
    -- este número crezca durante el día; no hay nada que arreglar a mano.
    'movidosDesdeElConteo', (
      SELECT count(*)
        FROM public.stock_count_entries e
        LEFT JOIN public.branch_stock bs
               ON bs.product_barcode = e.product_barcode
              AND bs.branch_id = v_session.branch_id
       WHERE e.session_id = v_session.id
         AND COALESCE(bs.stock, 0) <> e.system_qty
    ),
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

-- ─────────────────────────────────────────────────────────────────────
-- Permisos
-- ─────────────────────────────────────────────────────────────────────

REVOKE ALL ON FUNCTION public.open_stock_count(uuid, text, boolean, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.open_stock_count(uuid, text, boolean, text) TO service_role;

REVOKE ALL ON FUNCTION public.apply_stock_absolute(jsonb, uuid, text, text, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_stock_absolute(jsonb, uuid, text, text, uuid, text) TO service_role;

REVOKE ALL ON FUNCTION public.close_stock_count(uuid, text, boolean, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.close_stock_count(uuid, text, boolean, boolean) TO service_role;

REVOKE ALL ON FUNCTION public.stock_count_progress(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.stock_count_progress(uuid) TO service_role;
