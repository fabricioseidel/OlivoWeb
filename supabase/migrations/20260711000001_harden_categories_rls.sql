-- Endurece RLS en categories: la política actual permite a CUALQUIER usuario
-- autenticado (no solo ADMIN) crear, modificar y borrar categorías vía
-- PostgREST directo, sin pasar por las API routes que sí validan rol.
--
-- Toda la escritura legítima pasa por /api/categories (GET/POST/DELETE) y
-- /api/categories/[id] (PATCH/DELETE), que usan supabaseServer (service-role,
-- bypassa RLS) y ya validan sesión + rol ADMIN. Los clientes anon/authenticated
-- solo deben poder LEER categorías (necesario para el catálogo público).

DROP POLICY IF EXISTS "Block client inserts on categories" ON public.categories;
CREATE POLICY "Block client inserts on categories" ON public.categories
  AS RESTRICTIVE FOR INSERT TO anon, authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "Block client updates on categories" ON public.categories;
CREATE POLICY "Block client updates on categories" ON public.categories
  AS RESTRICTIVE FOR UPDATE TO anon, authenticated
  USING (false);

DROP POLICY IF EXISTS "Block client deletes on categories" ON public.categories;
CREATE POLICY "Block client deletes on categories" ON public.categories
  AS RESTRICTIVE FOR DELETE TO anon, authenticated
  USING (false);
