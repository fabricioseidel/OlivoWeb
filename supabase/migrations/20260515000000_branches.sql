-- Fase 1: Tabla branches + seed inicial
CREATE TABLE IF NOT EXISTS public.branches (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text        UNIQUE NOT NULL,
  name        text        NOT NULL,
  address     text,
  phone       text,
  is_default  boolean     NOT NULL DEFAULT false,
  is_active   boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS one_default_branch ON public.branches (is_default) WHERE is_default = true;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "branches_select_authenticated" ON public.branches FOR SELECT TO authenticated USING (true);
CREATE POLICY "branches_all_service" ON public.branches FOR ALL TO service_role USING (true) WITH CHECK (true);
INSERT INTO public.branches (code, name, is_default) VALUES
  ('PRINCIPAL', 'Principal', true),
  ('SUCURSAL2', 'Sucursal 2', false)
ON CONFLICT (code) DO NOTHING;
