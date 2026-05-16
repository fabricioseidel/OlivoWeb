-- Fase 3: enum payment_method + tabla sale_payments + backfill
DO $$ BEGIN
  CREATE TYPE public.payment_method AS ENUM ('CASH','DEBIT','CREDIT','TRANSFER','WALLET','OTHER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.sale_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id bigint NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  method public.payment_method NOT NULL,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  reference text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sale_payments_sale ON public.sale_payments(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_payments_method ON public.sale_payments(method);
ALTER TABLE public.sale_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sale_payments_select_authenticated" ON public.sale_payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "sale_payments_all_service" ON public.sale_payments FOR ALL TO service_role USING (true) WITH CHECK (true);
-- Backfill (ver migration completa aplicada via MCP)
