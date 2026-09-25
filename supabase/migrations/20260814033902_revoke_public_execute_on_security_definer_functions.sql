-- La migración anterior revocó a anon y authenticated, pero no surtió efecto:
-- en PostgreSQL las funciones nacen con EXECUTE concedido a PUBLIC, y esos
-- roles lo heredan de ahí. Hay que revocar a PUBLIC y volver a conceder de
-- forma explícita solo a service_role, que es quien las usa desde las rutas
-- de API del servidor.
--
-- Verificado tras aplicar: has_function_privilege('anon', ..., 'EXECUTE')
-- devuelve false para las nueve, y true para service_role.

DO $$
DECLARE
  f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'login_user',
        'apply_sale_v2',
        'decrement_product_stock',
        'decrement_stock_atomic',
        'increment_product_stock',
        'get_seller_name_from_user',
        'list_sales_missing_items',
        'rename_product_barcode',
        'update_seller_activity'
      )
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', f.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f.sig);
  END LOOP;
END $$;
