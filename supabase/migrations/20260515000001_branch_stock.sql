-- Fase 1: Stock por sucursal + backfill
CREATE TABLE IF NOT EXISTS public.branch_stock (
  branch_id        uuid    NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  product_barcode  text    NOT NULL REFERENCES public.products(barcode) ON DELETE CASCADE,
  stock            numeric NOT NULL DEFAULT 0,
  min_stock        integer DEFAULT 5,
  updated_at       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (branch_id, product_barcode)
);
CREATE INDEX IF NOT EXISTS idx_branch_stock_branch ON public.branch_stock(branch_id);
ALTER TABLE public.branch_stock ENABLE ROW LEVEL SECURITY;
CREATE POLICY "branch_stock_select_authenticated" ON public.branch_stock FOR SELECT TO authenticated USING (true);
CREATE POLICY "branch_stock_all_service" ON public.branch_stock FOR ALL TO service_role USING (true) WITH CHECK (true);
INSERT INTO public.branch_stock (branch_id, product_barcode, stock, min_stock)
SELECT (SELECT id FROM public.branches WHERE is_default = true LIMIT 1), p.barcode, COALESCE(p.stock, 0), COALESCE(p.min_stock, 5)
FROM public.products p ON CONFLICT (branch_id, product_barcode) DO NOTHING;
