-- Lote A seguridad: eliminar la función pública run_sql(text) que permitía
-- ejecutar SQL arbitrario vía supabaseAdmin.rpc('run_sql', { sql }).
DROP FUNCTION IF EXISTS public.run_sql(text);
