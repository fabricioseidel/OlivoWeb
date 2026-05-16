-- Fase 1: Asociación vendedor ↔ sucursal
CREATE TABLE IF NOT EXISTS public.seller_branches (
  seller_id   uuid    NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  branch_id   uuid    NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  is_primary  boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (seller_id, branch_id)
);
ALTER TABLE public.seller_branches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "seller_branches_select_authenticated" ON public.seller_branches FOR SELECT TO authenticated USING (true);
CREATE POLICY "seller_branches_all_service" ON public.seller_branches FOR ALL TO service_role USING (true) WITH CHECK (true);
