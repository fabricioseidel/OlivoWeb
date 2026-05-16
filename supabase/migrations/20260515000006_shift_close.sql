-- Fase 3: cash_shifts auto_close_at + closed_by_method + RPC close_shift
ALTER TABLE public.cash_shifts
  ADD COLUMN IF NOT EXISTS auto_close_at timestamptz,
  ADD COLUMN IF NOT EXISTS closed_by_method jsonb;
CREATE INDEX IF NOT EXISTS idx_cash_shifts_auto_close
  ON public.cash_shifts(auto_close_at)
  WHERE status = 'OPEN' AND auto_close_at IS NOT NULL;
-- close_shift RPC (cuadre por método) — ver migration completa via MCP
