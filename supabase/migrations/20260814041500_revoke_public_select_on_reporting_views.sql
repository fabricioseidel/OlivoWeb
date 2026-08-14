-- Seis vistas de reportería quedaban legibles desde la API REST pública.
--
-- Están definidas como SECURITY DEFINER, así que consultan con los permisos de
-- su dueño y saltan RLS. Con la clave anónima —que viaja en el bundle del
-- navegador y por tanto es pública— cualquiera podía leer resumen de ventas,
-- ventas por vendedor, productos más vendidos, historial de arqueos, usuarios
-- vendedores y productos por vencer.
--
-- Solo v_shifts_history se usa en el código, desde src/server/reports.service.ts
-- con la llave de servicio, que no depende de estos permisos. Las otras cinco
-- no se consultan desde ninguna parte.
--
-- Igual que con las funciones: hay que revocar a PUBLIC, porque anon y
-- authenticated heredan el permiso de ahí.

DO $$
DECLARE
  v text;
BEGIN
  FOREACH v IN ARRAY ARRAY[
    'products_expiring_soon',
    'v_seller_users',
    'sales_by_seller',
    'v_sales_summary',
    'v_top_products',
    'v_shifts_history'
  ]
  LOOP
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated', v);
    EXECUTE format('GRANT SELECT ON public.%I TO service_role', v);
  END LOOP;
END $$;
