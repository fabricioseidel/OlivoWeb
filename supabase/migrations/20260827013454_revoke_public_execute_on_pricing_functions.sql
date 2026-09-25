-- Corrige un error propio: las dos funciones nuevas de la Fase 1/3
-- (record_supplier_cost_change, marcar_pedido_enviado) revocaban EXECUTE de
-- `anon` y `authenticated` directamente, copiando el patrón de la PRIMERA
-- migración histórica sobre este tema (20260814033833) sin notar que esa
-- migración NO SURTÍA EFECTO: en PostgreSQL las funciones nacen con EXECUTE
-- concedido a PUBLIC, y anon/authenticated lo heredan de ahí. Revocar el
-- permiso nombrado no quita el heredado. La SEGUNDA migración histórica
-- (20260814033902) lo corrige revocando de PUBLIC y concediendo explícito a
-- service_role — el mismo arreglo se aplica acá.
--
-- Verificado tras aplicar: has_function_privilege('anon', ..., 'EXECUTE')
-- debe devolver false para las dos, y true para service_role.

DO $$
DECLARE
  f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('record_supplier_cost_change', 'marcar_pedido_enviado')
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', f.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f.sig);
  END LOOP;
END $$;
