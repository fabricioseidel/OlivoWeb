-- Cerrar el acceso público a funciones SECURITY DEFINER.
--
-- Estas funciones corren con los privilegios de su dueño y saltan RLS. Estaban
-- expuestas en la API REST pública, así que cualquiera en internet podía
-- llamarlas sin autenticarse:
--
--   login_user              probar contraseñas sin límite contra cualquier cuenta
--   increment/decrement     alterar el inventario
--   apply_sale_v2           registrar ventas
--   rename_product_barcode  renombrar códigos de barra
--
-- Es seguro revocarlas: todo lo que las usa de verdad son rutas de API del
-- servidor con la llave de servicio, que ignora estos permisos. La app de
-- operaciones es un contenedor Capacitor que carga el sitio web, sin claves de
-- Supabase propias ni llamadas directas.
--
-- OJO: esta migración por sí sola NO basta. Ver la siguiente.

REVOKE EXECUTE ON FUNCTION public.login_user(text, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.apply_sale_v2(numeric, text, numeric, numeric, numeric, numeric, text, text, text, jsonb, timestamptz, text, text, text, boolean) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.decrement_product_stock(bigint, numeric) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.decrement_stock_atomic(text, numeric, uuid, text, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_product_stock(text, numeric, uuid, text, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_seller_name_from_user(text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.list_sales_missing_items(text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rename_product_barcode(text, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_seller_activity(text, text) FROM anon, authenticated;

COMMENT ON FUNCTION public.login_user(text, text) IS
  'SIN USO. La web autentica con NextAuth y bcrypt en el servidor. Sin permiso para anon/authenticated: expuesta permitía fuerza bruta contra cualquier cuenta.';
