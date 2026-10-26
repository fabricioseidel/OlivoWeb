-- =====================================================================
-- 20261026000000_rls_tablas_de_respaldo.sql
--
-- Tres tablas de trabajo de una sola vez quedaron sin RLS:
-- `propuesta_categorias`, `respaldo_categorias_20260904` y
-- `respaldo_duplicados_20260912`. Hoy no están expuestas —anon y
-- authenticated no tienen ningún permiso sobre ellas—, pero el asesor de
-- Supabase las marca como críticas y basta un GRANT por defecto en una tabla
-- nueva para que una de estas copias del catálogo quede legible con la clave
-- pública. Se cierran como el resto de los respaldos: RLS activo y sin
-- políticas. Sólo las lee el rol de servicio, que no pasa por RLS.
--
-- Aditiva e idempotente.
-- =====================================================================

ALTER TABLE IF EXISTS public.propuesta_categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.respaldo_categorias_20260904 ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.respaldo_duplicados_20260912 ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.propuesta_categorias FROM anon, authenticated;
REVOKE ALL ON TABLE public.respaldo_categorias_20260904 FROM anon, authenticated;
REVOKE ALL ON TABLE public.respaldo_duplicados_20260912 FROM anon, authenticated;
