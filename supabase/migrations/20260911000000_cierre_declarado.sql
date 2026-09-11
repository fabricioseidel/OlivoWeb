-- ───────────────────────────────────────────────────────────────────────────
-- Cierre declarado de caja
--
-- Hasta ahora el cierre sólo sabía cuadrar contra las ventas que habían
-- pasado por el POS (`close_shift` suma `sale_payments`). En la operación
-- real del minimarket el POS todavía no se usa todos los días, así que ese
-- cierre daba "esperado 0" y todo el día aparecía como descuadre.
--
-- Este modelo invierte la dependencia: el cajero DECLARA lo que hubo
-- (efectivo contado, transferencias una por una, cierres de terminal) y esa
-- declaración es la verdad del día. Lo que diga el POS se guarda aparte, en
-- `pos_totals`, para comparar cuando el POS entre en marcha — pero no
-- bloquea ni ensucia el cierre mientras tanto.
-- ───────────────────────────────────────────────────────────────────────────

-- 1. cash_shifts: fecha operativa y modo declarado ─────────────────────────
ALTER TABLE public.cash_shifts
  ADD COLUMN IF NOT EXISTS business_date    date,
  ADD COLUMN IF NOT EXISTS is_declared      boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS declared_totals  jsonb,
  ADD COLUMN IF NOT EXISTS pos_totals       jsonb;

COMMENT ON COLUMN public.cash_shifts.business_date IS
  'Día al que corresponde el turno en hora de Chile. Un cierre hecho a las 00:30 pertenece al día anterior, y `started_at` solo no alcanza para saberlo.';
COMMENT ON COLUMN public.cash_shifts.is_declared IS
  'true = el cierre lo declaró el cajero a mano; los totales del POS son sólo referencia.';
COMMENT ON COLUMN public.cash_shifts.declared_totals IS
  'Totales declarados por método: { CASH: {bruto, ventas}, TRANSFER: {...}, CARD: {...}, total_ventas }.';
COMMENT ON COLUMN public.cash_shifts.pos_totals IS
  'Lo que el POS registró en el mismo turno. Sirve para conciliar cuando el POS se use de verdad.';

-- Los turnos viejos quedan con la fecha de su apertura.
UPDATE public.cash_shifts
   SET business_date = (started_at AT TIME ZONE 'America/Santiago')::date
 WHERE business_date IS NULL;

CREATE INDEX IF NOT EXISTS idx_cash_shifts_business_date
  ON public.cash_shifts(business_date DESC);

-- 2. Cierres de terminal (vouchers) ────────────────────────────────────────
-- Un día puede tener varios: si se vende después del cierre y se hace un
-- segundo cierre manual en la máquina, ese voucher también entra acá en vez
-- de sumarse a mano al total de tarjeta.
CREATE TABLE IF NOT EXISTS public.shift_vouchers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id        uuid NOT NULL REFERENCES public.cash_shifts(id) ON DELETE CASCADE,
  terminal_code   text,
  closed_at       timestamptz,
  credit_count    integer NOT NULL DEFAULT 0,
  credit_amount   numeric(12,2) NOT NULL DEFAULT 0,
  debit_count     integer NOT NULL DEFAULT 0,
  debit_amount    numeric(12,2) NOT NULL DEFAULT 0,
  prepaid_count   integer NOT NULL DEFAULT 0,
  prepaid_amount  numeric(12,2) NOT NULL DEFAULT 0,
  cash_count      integer NOT NULL DEFAULT 0,
  cash_amount     numeric(12,2) NOT NULL DEFAULT 0,
  -- Lo que dice el papel. Se guarda aparte de la suma de las partes a
  -- propósito: cuando no coinciden es porque el voucher viene mal leído o
  -- mal impreso, y eso hay que verlo, no corregirlo en silencio.
  total_amount    numeric(12,2) NOT NULL DEFAULT 0,
  parts_total     numeric(12,2) GENERATED ALWAYS AS
                    (credit_amount + debit_amount + prepaid_amount + cash_amount) STORED,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_shift_vouchers_shift ON public.shift_vouchers(shift_id);

COMMENT ON COLUMN public.shift_vouchers.parts_total IS
  'Suma de crédito + débito + prepago + efectivo. Si difiere de total_amount, el voucher está mal transcrito.';

-- 3. Transferencias recibidas, una por una ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.shift_transfers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id    uuid NOT NULL REFERENCES public.cash_shifts(id) ON DELETE CASCADE,
  amount      numeric(12,2) NOT NULL CHECK (amount > 0),
  payer       text,
  reference   text,
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_shift_transfers_shift ON public.shift_transfers(shift_id);

-- 4. Conteo de billetes por denominación ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.shift_denominations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id      uuid NOT NULL REFERENCES public.cash_shifts(id) ON DELETE CASCADE,
  denomination  integer NOT NULL CHECK (denomination > 0),
  quantity      integer NOT NULL CHECK (quantity >= 0),
  UNIQUE (shift_id, denomination)
);
CREATE INDEX IF NOT EXISTS idx_shift_denominations_shift ON public.shift_denominations(shift_id);

COMMENT ON TABLE public.shift_denominations IS
  'Desglose del efectivo contado. Sin esto, un descuadre sólo se sabe que existe; con esto se puede rastrear.';

-- 5. Fiados: cuenta corriente por persona ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.customer_accounts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  phone       text,
  notes       text,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_customer_accounts_name
  ON public.customer_accounts (lower(trim(name)));

CREATE TABLE IF NOT EXISTS public.account_entries (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id   uuid NOT NULL REFERENCES public.customer_accounts(id) ON DELETE CASCADE,
  shift_id     uuid REFERENCES public.cash_shifts(id) ON DELETE SET NULL,
  kind         text NOT NULL CHECK (kind IN ('CHARGE','PAYMENT')),
  amount       numeric(12,2) NOT NULL CHECK (amount > 0),
  occurred_on  date NOT NULL DEFAULT ((now() AT TIME ZONE 'America/Santiago')::date),
  method       public.payment_method,
  note         text,
  created_by   uuid,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_account_entries_account ON public.account_entries(account_id, occurred_on DESC);
CREATE INDEX IF NOT EXISTS idx_account_entries_shift   ON public.account_entries(shift_id);

COMMENT ON TABLE public.account_entries IS
  'Cargos (se llevó fiado) y abonos (pagó) con fecha. Reemplaza la lista que se tachaba: tachar borra la historia, esto la conserva.';

CREATE OR REPLACE VIEW public.v_customer_balances AS
SELECT
  a.id,
  a.name,
  a.phone,
  a.is_active,
  COALESCE(SUM(e.amount) FILTER (WHERE e.kind = 'CHARGE'),  0) AS total_charges,
  COALESCE(SUM(e.amount) FILTER (WHERE e.kind = 'PAYMENT'), 0) AS total_payments,
  COALESCE(SUM(e.amount) FILTER (WHERE e.kind = 'CHARGE'),  0)
    - COALESCE(SUM(e.amount) FILTER (WHERE e.kind = 'PAYMENT'), 0) AS balance,
  MAX(e.occurred_on)                                          AS last_movement,
  MIN(e.occurred_on) FILTER (WHERE e.kind = 'CHARGE')         AS oldest_charge
FROM public.customer_accounts a
LEFT JOIN public.account_entries e ON e.account_id = a.id
GROUP BY a.id, a.name, a.phone, a.is_active;

-- 6. RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE public.shift_vouchers      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_transfers     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_denominations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_accounts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_entries     ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['shift_vouchers','shift_transfers','shift_denominations',
                           'customer_accounts','account_entries']
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.%I', t || '_select_authenticated', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (true)',
      t || '_select_authenticated', t);
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.%I', t || '_all_service', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
      t || '_all_service', t);
  END LOOP;
END $$;

-- La vista hereda el RLS de las tablas base; se revoca al público igual que
-- el resto de las vistas de reporte.
REVOKE ALL ON public.v_customer_balances FROM PUBLIC, anon;
GRANT SELECT ON public.v_customer_balances TO authenticated, service_role;
