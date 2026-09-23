-- ───────────────────────────────────────────────────────────────────────────
-- RPC del cierre declarado.
--
-- Toda la lógica vive acá y no en TypeScript a propósito: el POS (celular) y
-- OlivoWeb (computador) son dos repos distintos contra la misma base. Si el
-- cálculo estuviera en cada app, tarde o temprano una cerraría distinto de la
-- otra — ya pasó con `shifts.service.ts`, que se duplicó y divergió.
-- ───────────────────────────────────────────────────────────────────────────

-- Cuenta de fiado por nombre, creándola si es nueva.
CREATE OR REPLACE FUNCTION public.find_or_create_account(p_name text)
RETURNS uuid
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_id   uuid;
  v_name text := trim(p_name);
BEGIN
  IF v_name IS NULL OR v_name = '' THEN
    RAISE EXCEPTION 'El nombre de la cuenta no puede estar vacío';
  END IF;

  SELECT id INTO v_id FROM public.customer_accounts
   WHERE lower(trim(name)) = lower(v_name);

  IF v_id IS NULL THEN
    INSERT INTO public.customer_accounts(name) VALUES (v_name) RETURNING id INTO v_id;
  END IF;

  RETURN v_id;
END;
$$;

-- ───────────────────────────────────────────────────────────────────────────
-- resumen_cierre(shift) → todo lo necesario para mostrar e imprimir el cierre
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.resumen_cierre(p_shift_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT jsonb_build_object(
    'shift', to_jsonb(s) - 'closed_by_method',
    'branch', (SELECT b.name FROM public.branches b WHERE b.id = s.branch_id),
    'denominations', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'denomination', d.denomination,
               'quantity',     d.quantity,
               'subtotal',     d.denomination::numeric * d.quantity)
             ORDER BY d.denomination DESC)
        FROM public.shift_denominations d WHERE d.shift_id = s.id), '[]'::jsonb),
    'transfers', COALESCE((
      SELECT jsonb_agg(to_jsonb(t) ORDER BY t.created_at)
        FROM public.shift_transfers t WHERE t.shift_id = s.id), '[]'::jsonb),
    'vouchers', COALESCE((
      SELECT jsonb_agg(to_jsonb(v) ORDER BY v.closed_at NULLS LAST, v.created_at)
        FROM public.shift_vouchers v WHERE v.shift_id = s.id), '[]'::jsonb),
    'movements', COALESCE((
      SELECT jsonb_agg(to_jsonb(m) ORDER BY m.created_at)
        FROM public.cash_movements m WHERE m.shift_id = s.id), '[]'::jsonb),
    'account_entries', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'id', e.id, 'kind', e.kind, 'amount', e.amount,
               'method', e.method, 'note', e.note,
               'account_id', e.account_id, 'name', a.name)
             ORDER BY e.kind, a.name)
        FROM public.account_entries e
        JOIN public.customer_accounts a ON a.id = e.account_id
       WHERE e.shift_id = s.id), '[]'::jsonb),
    -- Saldos vigentes al momento de imprimir: es el dato que hoy se lleva
    -- tachando nombres en el cuaderno.
    'balances', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'id', b.id, 'name', b.name, 'balance', b.balance,
               'oldest_charge', b.oldest_charge)
             ORDER BY b.balance DESC)
        FROM public.v_customer_balances b WHERE b.balance > 0), '[]'::jsonb)
  )
  FROM public.cash_shifts s
  WHERE s.id = p_shift_id;
$$;

-- ───────────────────────────────────────────────────────────────────────────
-- registrar_cierre(shift, payload) → jsonb con el resumen del día
--
-- Es idempotente por turno: vuelve a escribir vouchers, transferencias,
-- denominaciones y movimientos de fiado desde cero. Así corregir un cierre
-- desde el computador es reenviar el mismo cierre arreglado, sin duplicar.
--
-- Cómo se separa venta de cobro de deuda:
--   ventas_EFECTIVO = (contado - sencillo inicial) - ingresos + egresos - abonos en efectivo
--   ventas_TRANSFER = suma de transferencias  - abonos por transferencia
--   ventas_TARJETA  = suma de vouchers        - abonos con tarjeta
-- Un abono es plata que entra pero no es venta de hoy: si no se restara, el
-- día que alguien paga su fiado aparecería como un día de ventas altísimo.
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.registrar_cierre(
  p_shift_id uuid,
  p_payload  jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_shift          public.cash_shifts%ROWTYPE;
  v_business_date  date;
  v_cash_counted   numeric(12,2) := 0;
  v_den_total      numeric(12,2) := 0;
  v_den_count      integer := 0;
  v_transfers      numeric(12,2) := 0;
  v_vouchers       numeric(12,2) := 0;
  v_mov_in         numeric(12,2) := 0;
  v_mov_out        numeric(12,2) := 0;
  v_abono_cash     numeric(12,2) := 0;
  v_abono_transfer numeric(12,2) := 0;
  v_abono_card     numeric(12,2) := 0;
  v_sales_cash     numeric(12,2) := 0;
  v_sales_transfer numeric(12,2) := 0;
  v_sales_card     numeric(12,2) := 0;
  v_charges        numeric(12,2) := 0;
  v_pos            jsonb;
  v_declared       jsonb;
  v_item           jsonb;
  v_account_id     uuid;
BEGIN
  SELECT * INTO v_shift FROM public.cash_shifts WHERE id = p_shift_id FOR UPDATE;
  IF v_shift.id IS NULL THEN
    RAISE EXCEPTION 'El turno % no existe', p_shift_id;
  END IF;

  v_business_date := COALESCE(
    NULLIF(p_payload->>'business_date','')::date,
    v_shift.business_date,
    (v_shift.started_at AT TIME ZONE 'America/Santiago')::date
  );

  -- ── Denominaciones ──────────────────────────────────────────────────────
  DELETE FROM public.shift_denominations WHERE shift_id = p_shift_id;

  IF jsonb_typeof(p_payload->'denominations') = 'array' THEN
    INSERT INTO public.shift_denominations(shift_id, denomination, quantity)
    SELECT p_shift_id,
           (d->>'denomination')::int,
           (d->>'quantity')::int
      FROM jsonb_array_elements(p_payload->'denominations') d
     WHERE COALESCE((d->>'quantity')::int, 0) > 0
       AND COALESCE((d->>'denomination')::int, 0) > 0;

    SELECT COALESCE(SUM(denomination::numeric * quantity), 0), COUNT(*)
      INTO v_den_total, v_den_count
      FROM public.shift_denominations WHERE shift_id = p_shift_id;
  END IF;

  -- Si hubo conteo por denominación manda ese total: es el que se puede
  -- auditar billete por billete. El monto suelto queda como salida de
  -- emergencia para cuando no se alcanzó a desglosar.
  v_cash_counted := CASE
    WHEN v_den_count > 0 THEN v_den_total
    ELSE COALESCE((p_payload->>'cash_counted')::numeric, 0)
  END;

  -- ── Transferencias ──────────────────────────────────────────────────────
  DELETE FROM public.shift_transfers WHERE shift_id = p_shift_id;

  IF jsonb_typeof(p_payload->'transfers') = 'array' THEN
    INSERT INTO public.shift_transfers(shift_id, amount, payer, reference, note)
    SELECT p_shift_id,
           (t->>'amount')::numeric,
           NULLIF(t->>'payer',''),
           NULLIF(t->>'reference',''),
           NULLIF(t->>'note','')
      FROM jsonb_array_elements(p_payload->'transfers') t
     WHERE COALESCE((t->>'amount')::numeric, 0) > 0;
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_transfers
    FROM public.shift_transfers WHERE shift_id = p_shift_id;

  -- ── Vouchers (cierres de terminal) ──────────────────────────────────────
  DELETE FROM public.shift_vouchers WHERE shift_id = p_shift_id;

  IF jsonb_typeof(p_payload->'vouchers') = 'array' THEN
    INSERT INTO public.shift_vouchers(
      shift_id, terminal_code, closed_at,
      credit_count, credit_amount, debit_count, debit_amount,
      prepaid_count, prepaid_amount, cash_count, cash_amount,
      total_amount, notes)
    SELECT p_shift_id,
           NULLIF(v->>'terminal_code',''),
           NULLIF(v->>'closed_at','')::timestamptz,
           COALESCE((v->>'credit_count')::int, 0),
           COALESCE((v->>'credit_amount')::numeric, 0),
           COALESCE((v->>'debit_count')::int, 0),
           COALESCE((v->>'debit_amount')::numeric, 0),
           COALESCE((v->>'prepaid_count')::int, 0),
           COALESCE((v->>'prepaid_amount')::numeric, 0),
           COALESCE((v->>'cash_count')::int, 0),
           COALESCE((v->>'cash_amount')::numeric, 0),
           COALESCE((v->>'total_amount')::numeric, 0),
           NULLIF(v->>'notes','')
      FROM jsonb_array_elements(p_payload->'vouchers') v;
  END IF;

  SELECT COALESCE(SUM(total_amount), 0) INTO v_vouchers
    FROM public.shift_vouchers WHERE shift_id = p_shift_id;

  -- ── Fiados del turno ────────────────────────────────────────────────────
  -- Se reescriben los del turno; los de días anteriores no se tocan.
  DELETE FROM public.account_entries WHERE shift_id = p_shift_id;

  IF jsonb_typeof(p_payload->'fiados') = 'array' THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_payload->'fiados') LOOP
      IF COALESCE((v_item->>'amount')::numeric, 0) <= 0 THEN CONTINUE; END IF;
      v_account_id := COALESCE(
        NULLIF(v_item->>'account_id','')::uuid,
        public.find_or_create_account(v_item->>'name')
      );
      INSERT INTO public.account_entries(account_id, shift_id, kind, amount, occurred_on, note)
      VALUES (v_account_id, p_shift_id, 'CHARGE', (v_item->>'amount')::numeric,
              v_business_date, NULLIF(v_item->>'note',''));
    END LOOP;
  END IF;

  IF jsonb_typeof(p_payload->'abonos') = 'array' THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_payload->'abonos') LOOP
      IF COALESCE((v_item->>'amount')::numeric, 0) <= 0 THEN CONTINUE; END IF;
      v_account_id := COALESCE(
        NULLIF(v_item->>'account_id','')::uuid,
        public.find_or_create_account(v_item->>'name')
      );
      INSERT INTO public.account_entries(account_id, shift_id, kind, amount, occurred_on, method, note)
      VALUES (v_account_id, p_shift_id, 'PAYMENT', (v_item->>'amount')::numeric,
              v_business_date,
              COALESCE(NULLIF(v_item->>'method','')::public.payment_method, 'CASH'),
              NULLIF(v_item->>'note',''));
    END LOOP;
  END IF;

  SELECT COALESCE(SUM(amount) FILTER (WHERE kind = 'CHARGE'), 0),
         COALESCE(SUM(amount) FILTER (WHERE kind = 'PAYMENT' AND method = 'CASH'), 0),
         COALESCE(SUM(amount) FILTER (WHERE kind = 'PAYMENT' AND method = 'TRANSFER'), 0),
         COALESCE(SUM(amount) FILTER (WHERE kind = 'PAYMENT' AND method IN ('CARD','DEBIT','CREDIT','WALLET')), 0)
    INTO v_charges, v_abono_cash, v_abono_transfer, v_abono_card
    FROM public.account_entries WHERE shift_id = p_shift_id;

  -- ── Movimientos manuales de efectivo del turno ──────────────────────────
  SELECT COALESCE(SUM(amount) FILTER (WHERE type = 'IN'),  0),
         COALESCE(SUM(amount) FILTER (WHERE type = 'OUT'), 0)
    INTO v_mov_in, v_mov_out
    FROM public.cash_movements
   WHERE shift_id = p_shift_id AND method = 'CASH';

  -- ── Ventas declaradas por método ────────────────────────────────────────
  v_sales_cash     := v_cash_counted - v_shift.starting_cash - v_mov_in + v_mov_out - v_abono_cash;
  v_sales_transfer := v_transfers - v_abono_transfer;
  v_sales_card     := v_vouchers   - v_abono_card;

  -- ── Lo que dice el POS, para conciliar más adelante ─────────────────────
  SELECT COALESCE(jsonb_object_agg(method, monto), '{}'::jsonb) INTO v_pos
    FROM (
      SELECT sp.method::text AS method, SUM(sp.amount) AS monto
        FROM public.sale_payments sp
        JOIN public.sales s ON s.id = sp.sale_id
       WHERE s.shift_id = p_shift_id AND NOT s.voided
       GROUP BY sp.method
    ) q;

  v_declared := jsonb_build_object(
    'CASH', jsonb_build_object(
      'contado',  v_cash_counted,
      'inicial',  v_shift.starting_cash,
      'ingresos', v_mov_in,
      'egresos',  v_mov_out,
      'abonos',   v_abono_cash,
      'ventas',   v_sales_cash),
    'TRANSFER', jsonb_build_object(
      'bruto',  v_transfers,
      'abonos', v_abono_transfer,
      'ventas', v_sales_transfer),
    'CARD', jsonb_build_object(
      'bruto',  v_vouchers,
      'abonos', v_abono_card,
      'ventas', v_sales_card),
    'fiados_otorgados', v_charges,
    'abonos_recibidos', v_abono_cash + v_abono_transfer + v_abono_card,
    'total_ventas',     v_sales_cash + v_sales_transfer + v_sales_card
  );

  UPDATE public.cash_shifts SET
    status          = 'CLOSED',
    ended_at        = COALESCE(ended_at, now()),
    business_date   = v_business_date,
    is_declared     = true,
    actual_cash     = v_cash_counted,
    -- En modo declarado el esperado ES lo declarado: no hay una fuente
    -- independiente contra la cual cuadrar mientras el POS no se use. La
    -- comparación real queda en pos_totals vs declared_totals.
    expected_cash   = v_cash_counted,
    difference      = 0,
    declared_totals = v_declared,
    pos_totals      = v_pos,
    notes           = COALESCE(NULLIF(p_payload->>'notes',''), notes),
    updated_at      = now()
  WHERE id = p_shift_id;

  RETURN public.resumen_cierre(p_shift_id);
END;
$$;

REVOKE ALL ON FUNCTION public.registrar_cierre(uuid, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.resumen_cierre(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.find_or_create_account(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_cierre(uuid, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.resumen_cierre(uuid) TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.find_or_create_account(text) TO service_role;
