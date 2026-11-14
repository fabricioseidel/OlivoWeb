-- =====================================================================
-- 20261114000000_inventario_por_sesion.sql
--
-- La pestaña Conteo del POS pasa a llamarse Inventario y gana cuatro cosas
-- que el modelo de marcas (20260912) ya casi permitía:
--
--   1. CÓMO EMPIEZA. Al abrir se elige si el inventario parte "desde 0"
--      (lo que no se cuente queda en 0 al cerrar) o "mantiene el actual"
--      (sólo cambia lo escaneado). Se guarda en la sesión para que todos los
--      teléfonos vean la misma regla. No toca el stock al abrir: el conteo
--      sigue siendo independiente de las ventas y se aplica al cerrar.
--
--   2. VENCIMIENTO Y PRECIO POR MARCA. Cada marca puede llevar la fecha de
--      vencimiento vista en ese lugar y guarda el precio de venta vigente al
--      contarla. `products.expiry_date` queda con el vencimiento MÁS PRÓXIMO
--      de las marcas de la sesión.
--
--   3. HISTORIAL POR LOTE Y POR PERSONA. Cada lote guardado (`op_id`) es una
--      subida: quién, cuándo, qué productos y cuántos. Si Mariana contó 3,
--      Alfredo 5 y Fabricio 2, el producto queda en 10 y se puede ver de
--      dónde salió cada parte.
--
--   4. NADA SE BORRA SIN RASTRO. "Corregir" un producto borra sus marcas
--      previas; ahora cada marca borrada se copia a
--      `stock_count_tags_anuladas` antes de desaparecer.
--
-- Todo es aditivo: no cambia `apply_stock_absolute`, `open_stock_count` ni
-- `close_stock_count`, así que las versiones anteriores del POS siguen
-- funcionando contra esta base.
-- =====================================================================

-- ── 1. Cómo empieza el inventario ────────────────────────────────────

ALTER TABLE public.stock_count_sessions
  ADD COLUMN IF NOT EXISTS start_mode text NOT NULL DEFAULT 'KEEP';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'stock_count_sessions_start_mode_check'
  ) THEN
    ALTER TABLE public.stock_count_sessions
      ADD CONSTRAINT stock_count_sessions_start_mode_check
      CHECK (start_mode IN ('KEEP', 'ZERO'));
  END IF;
END $$;

COMMENT ON COLUMN public.stock_count_sessions.start_mode IS
  'KEEP: se mantiene el inventario actual y solo cambia lo escaneado. ZERO: el inventario parte desde 0; lo que no se cuente queda en 0 al cerrar.';

-- ── 2. Vencimiento y precio por marca ────────────────────────────────

ALTER TABLE public.stock_count_tags
  ADD COLUMN IF NOT EXISTS expiry_date date,
  ADD COLUMN IF NOT EXISTS sale_price  numeric;

COMMENT ON COLUMN public.stock_count_tags.expiry_date IS
  'Vencimiento visto al contar esta marca (opcional).';
COMMENT ON COLUMN public.stock_count_tags.sale_price IS
  'Precio de venta del producto al momento de guardar la marca.';

CREATE INDEX IF NOT EXISTS idx_stock_count_tags_lote
  ON public.stock_count_tags (session_id, op_id);

-- ── 4. Marcas anuladas (lo que borra "Corregir") ─────────────────────

CREATE TABLE IF NOT EXISTS public.stock_count_tags_anuladas (
  id              bigint PRIMARY KEY,
  session_id      uuid NOT NULL,
  product_barcode text NOT NULL,
  qty             numeric NOT NULL,
  op_id           text,
  counted_at      timestamptz,
  counted_by      text,
  expiry_date     date,
  sale_price      numeric,
  anulada_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.stock_count_tags_anuladas IS
  'Copia de cada marca de inventario borrada (correccion de un producto): el historial nunca pierde lo que se conto.';

ALTER TABLE public.stock_count_tags_anuladas ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'stock_count_tags_anuladas'
       AND policyname = 'stock_count_tags_anuladas_all_service'
  ) THEN
    CREATE POLICY "stock_count_tags_anuladas_all_service" ON public.stock_count_tags_anuladas
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.stock_count_tags_guardar_anulada()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Si la sesión entera se está borrando (cascada) no hay nada que auditar.
  IF EXISTS (SELECT 1 FROM public.stock_count_sessions WHERE id = OLD.session_id) THEN
    INSERT INTO public.stock_count_tags_anuladas (
      id, session_id, product_barcode, qty, op_id, counted_at, counted_by, expiry_date, sale_price
    ) VALUES (
      OLD.id, OLD.session_id, OLD.product_barcode, OLD.qty, OLD.op_id, OLD.counted_at,
      OLD.counted_by, OLD.expiry_date, OLD.sale_price
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_stock_count_tags_anulada ON public.stock_count_tags;
CREATE TRIGGER trg_stock_count_tags_anulada
  BEFORE DELETE ON public.stock_count_tags
  FOR EACH ROW EXECUTE FUNCTION public.stock_count_tags_guardar_anulada();

-- ── 2b. Anotar un lote ya guardado ───────────────────────────────────
--
-- Se llama justo después de `apply_stock_absolute` con el mismo `op_id`.
-- Va aparte para no reescribir esa función; es idempotente, así que un
-- reintento del outbox la puede repetir sin efecto.
--
-- `p_items`: [{ "barcode": "...", "expiry": "2027-03-31" }]  (expiry opcional)

CREATE OR REPLACE FUNCTION public.stock_count_annotate(
  p_session_id uuid,
  p_op_id      text,
  p_items      jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_item     jsonb;
  v_barcode  text;
  v_expiry   date;
  v_fechas   integer := 0;
BEGIN
  IF p_session_id IS NULL OR COALESCE(btrim(p_op_id), '') = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Falta la sesión o el lote');
  END IF;

  -- Precio vigente al contar, para todas las marcas del lote.
  UPDATE public.stock_count_tags t
     SET sale_price = p.sale_price
    FROM public.products p
   WHERE t.session_id = p_session_id
     AND t.op_id = p_op_id
     AND p.barcode = t.product_barcode
     AND t.sale_price IS NULL;

  IF p_items IS NOT NULL AND jsonb_typeof(p_items) = 'array' THEN
    FOR v_item IN SELECT jsonb_array_elements(p_items) LOOP
      v_barcode := btrim(COALESCE(v_item->>'barcode', ''));
      IF v_barcode = '' THEN CONTINUE; END IF;

      BEGIN
        v_expiry := NULLIF(btrim(COALESCE(v_item->>'expiry', '')), '')::date;
      EXCEPTION WHEN others THEN
        v_expiry := NULL;  -- una fecha mal escrita no puede botar el lote
      END;
      IF v_expiry IS NULL THEN CONTINUE; END IF;

      UPDATE public.stock_count_tags
         SET expiry_date = v_expiry
       WHERE session_id = p_session_id
         AND op_id = p_op_id
         AND product_barcode = v_barcode;

      -- El producto queda con el vencimiento más próximo visto en la sesión.
      UPDATE public.products p
         SET expiry_date = (
               SELECT to_char(min(t.expiry_date), 'YYYY-MM-DD')
                 FROM public.stock_count_tags t
                WHERE t.session_id = p_session_id
                  AND t.product_barcode = v_barcode
                  AND t.expiry_date IS NOT NULL
             )
       WHERE p.barcode = v_barcode;

      v_fechas := v_fechas + 1;
    END LOOP;
  END IF;

  RETURN jsonb_build_object('ok', true, 'conVencimiento', v_fechas);
END;
$$;

COMMENT ON FUNCTION public.stock_count_annotate(uuid, text, jsonb) IS
  'Completa las marcas de un lote de inventario ya guardado: precio vigente y vencimiento. Deja en products.expiry_date el vencimiento mas proximo de la sesion. Idempotente.';

-- ── 3. Historial: lotes y totales por persona ────────────────────────

CREATE OR REPLACE FUNCTION public.stock_count_history(
  p_session_id uuid,
  p_limit      integer DEFAULT 100
) RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  WITH marcas AS (
    SELECT t.id, t.product_barcode, t.qty, t.counted_at, t.expiry_date, t.sale_price,
           COALESCE(t.op_id, 'marca-' || t.id) AS lote,
           COALESCE(NULLIF(btrim(t.counted_by), ''), 'Sin nombre') AS por,
           COALESCE(p.name, t.product_barcode) AS nombre
      FROM public.stock_count_tags t
      LEFT JOIN public.products p ON p.barcode = t.product_barcode
     WHERE t.session_id = p_session_id
  ),
  lotes AS (
    SELECT lote,
           min(por) AS por,
           min(counted_at) AS guardado,
           count(DISTINCT product_barcode) AS productos,
           COALESCE(sum(qty), 0) AS unidades,
           jsonb_agg(jsonb_build_object(
             'barcode', product_barcode,
             'name', nombre,
             'qty', qty,
             'expiry', expiry_date,
             'price', sale_price
           ) ORDER BY id) AS items
      FROM marcas
     GROUP BY lote
  ),
  personas AS (
    SELECT por,
           count(DISTINCT lote) AS lotes,
           count(DISTINCT product_barcode) AS productos,
           COALESCE(sum(qty), 0) AS unidades,
           max(counted_at) AS ultimo
      FROM marcas
     GROUP BY por
  )
  SELECT jsonb_build_object(
    'ok', true,
    'totalLotes', (SELECT count(*) FROM lotes),
    'lotes', COALESCE((
      SELECT jsonb_agg(to_jsonb(l) ORDER BY l.guardado DESC)
        FROM (SELECT * FROM lotes ORDER BY guardado DESC
               LIMIT GREATEST(COALESCE(p_limit, 100), 1)) l
    ), '[]'::jsonb),
    'porPersona', COALESCE((
      SELECT jsonb_agg(to_jsonb(x) ORDER BY x.unidades DESC) FROM personas x
    ), '[]'::jsonb),
    'anuladas', (SELECT count(*) FROM public.stock_count_tags_anuladas a
                  WHERE a.session_id = p_session_id)
  );
$$;

COMMENT ON FUNCTION public.stock_count_history(uuid, integer) IS
  'Historial de un inventario: cada lote guardado (quien, cuando, que productos) y el total por persona.';

-- Cuánto lleva contado un producto, ahora con el desglose por persona.
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
                  AND product_barcode = p_barcode),
    'porPersona', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('por', q.por, 'qty', q.qty) ORDER BY q.primero)
        FROM (
          SELECT COALESCE(NULLIF(btrim(counted_by), ''), 'Sin nombre') AS por,
                 SUM(qty) AS qty, min(counted_at) AS primero
            FROM public.stock_count_tags
           WHERE session_id = p_session_id AND product_barcode = p_barcode
           GROUP BY 1
        ) q
    ), '[]'::jsonb),
    'vencimiento', (SELECT min(expiry_date) FROM public.stock_count_tags
                     WHERE session_id = p_session_id
                       AND product_barcode = p_barcode)
  );
$$;

REVOKE ALL ON FUNCTION public.stock_count_annotate(uuid, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.stock_count_annotate(uuid, text, jsonb) TO service_role;

REVOKE ALL ON FUNCTION public.stock_count_history(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.stock_count_history(uuid, integer) TO service_role;

REVOKE ALL ON FUNCTION public.stock_count_product(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.stock_count_product(uuid, text) TO service_role;

REVOKE ALL ON FUNCTION public.stock_count_tags_guardar_anulada() FROM PUBLIC, anon, authenticated;
