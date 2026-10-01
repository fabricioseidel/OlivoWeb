-- =====================================================================
-- 20261001000000_cierre_caja_por_turno.sql
--
-- close_shift calculaba lo esperado con las ventas de la MISMA SUCURSAL y
-- dentro del horario del turno. Pero /admin/pos no indica sucursal y
-- apply_sale le pone la sucursal por defecto: si el turno es de otra
-- sucursal, esas ventas no se contaban y el arqueo mostraba un faltante que
-- no existía.
--
-- Cada venta ya guarda su turno (sales.shift_id, obligatorio desde que el
-- POS exige caja abierta). Ahora cuentan las ventas de ESTE turno, y por
-- sucursal y horario sólo las antiguas que no tienen turno.
--
-- Idempotente (CREATE OR REPLACE). Mismo resultado y firma.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.close_shift(p_shift_id uuid, p_counts jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_shift            public.cash_shifts%ROWTYPE;
  v_branch_id        uuid;
  v_started          timestamptz;
  v_ended            timestamptz := now();
  v_starting         numeric;
  v_breakdown        jsonb := '{}'::jsonb;
  v_method_text      text;
  v_method_enum      public.payment_method;
  v_expected         numeric;
  v_actual           numeric;
  v_move_in          numeric;
  v_move_out         numeric;
  v_total_actual_cash numeric := 0;
  v_total_expected_cash numeric := 0;
  m text;
BEGIN
  SELECT * INTO v_shift FROM public.cash_shifts WHERE id = p_shift_id;
  IF v_shift IS NULL THEN
    RAISE EXCEPTION 'Shift % no existe', p_shift_id;
  END IF;
  IF v_shift.status = 'CLOSED' THEN
    RAISE EXCEPTION 'Shift % ya está cerrado', p_shift_id;
  END IF;

  v_branch_id := v_shift.branch_id;
  v_started   := v_shift.started_at;
  v_starting  := v_shift.starting_cash;

  FOR m IN
    SELECT DISTINCT method::text
    FROM (
      SELECT sp.method
      FROM public.sale_payments sp
      JOIN public.sales s ON s.id = sp.sale_id
      WHERE NOT s.voided
        AND (s.shift_id = p_shift_id
             OR (s.shift_id IS NULL
                 AND s.branch_id IS NOT DISTINCT FROM v_branch_id
                 AND s.ts >= v_started AND s.ts <= v_ended))
      UNION
      SELECT (k::text)::public.payment_method
      FROM jsonb_object_keys(p_counts) k
      WHERE upper(k::text) IN ('CASH','DEBIT','CREDIT','TRANSFER','WALLET','OTHER','CARD')
      UNION
      SELECT cm.method
      FROM public.cash_movements cm
      WHERE cm.shift_id = p_shift_id
    ) all_methods
  LOOP
    v_method_text := m;
    v_method_enum := m::public.payment_method;

    -- Esperado por método = pagos de las ventas del turno
    SELECT COALESCE(SUM(sp.amount), 0) INTO v_expected
    FROM public.sale_payments sp
    JOIN public.sales s ON s.id = sp.sale_id
    WHERE NOT s.voided
      AND sp.method = v_method_enum
      AND (s.shift_id = p_shift_id
           OR (s.shift_id IS NULL
               AND s.branch_id IS NOT DISTINCT FROM v_branch_id
               AND s.ts >= v_started AND s.ts <= v_ended));

    -- Movimientos manuales de ESTE método (ingresos/egresos que no son venta)
    SELECT
      COALESCE(SUM(amount) FILTER (WHERE type = 'IN'), 0),
      COALESCE(SUM(amount) FILTER (WHERE type = 'OUT'), 0)
    INTO v_move_in, v_move_out
    FROM public.cash_movements
    WHERE shift_id = p_shift_id AND method = v_method_enum;

    v_expected := v_expected + v_move_in - v_move_out;

    -- Sólo CASH arrastra el fondo inicial del turno.
    IF v_method_enum = 'CASH' THEN
      v_expected := v_expected + v_starting;
    END IF;

    v_actual := COALESCE(
      (p_counts->>v_method_text)::numeric,
      (p_counts->>lower(v_method_text))::numeric,
      0
    );

    v_breakdown := v_breakdown || jsonb_build_object(v_method_text, jsonb_build_object(
      'expected',   v_expected,
      'actual',     v_actual,
      'difference', v_actual - v_expected
    ));

    IF v_method_enum = 'CASH' THEN
      v_total_expected_cash := v_expected;
      v_total_actual_cash   := v_actual;
    END IF;
  END LOOP;

  UPDATE public.cash_shifts SET
    status            = 'CLOSED',
    ended_at          = v_ended,
    actual_cash       = v_total_actual_cash,
    expected_cash     = v_total_expected_cash,
    difference        = v_total_actual_cash - v_total_expected_cash,
    closed_by_method  = v_breakdown,
    updated_at        = now()
  WHERE id = p_shift_id;

  RETURN v_breakdown;
END;
$function$;
