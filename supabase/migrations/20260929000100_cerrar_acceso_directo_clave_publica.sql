-- =====================================================================
-- 20260929000100_cerrar_acceso_directo_clave_publica.sql
--
-- La clave pública de Supabase (anon) viaja en el JavaScript del sitio: la
-- tiene cualquiera. Hasta hoy, con ella se podía:
--
--   - leer el COSTO de compra, el precio sugerido y el margen de todo el
--     catálogo (products.purchase_price, suggested_price, margin_override);
--   - leer todas las líneas de venta del POS (sale_items, política "open read")
--     y todos los códigos de cupón (coupons, política con `true`);
--   - escribir y borrar en uber_eats_products / uber_eats_stores
--     (política "Allow all operations" para public).
--
-- Y el rol `authenticated` —que el sitio NO usa: el login es NextAuth— tenía
-- políticas de lectura sobre clientes, caja, correos enviados, campañas y
-- movimientos de puntos. Cualquiera que se registrara directamente en
-- Supabase Auth con la clave pública obtenía ese rol. Hoy auth.users está
-- vacío (nadie lo hizo), pero la puerta estaba abierta.
--
-- El sitio sólo lee desde el navegador tres tablas: products (catálogo),
-- categories y settings. Todo lo demás pasa por rutas del servidor con la
-- service key, que no depende de estos permisos. Así que:
--
--   1. products: anon/authenticated sólo pueden LEER las columnas públicas,
--      entre ellas `costo_cargado` (20260929000000), que dice si hay costo
--      sin mostrarlo.
--
-- ORDEN: aplicar DESPUÉS de publicar el código que ya no lee costos con la
-- clave pública. Antes, el sitio publicado dejaría de mostrar productos.
--   2. categories y settings: sólo lectura.
--   3. Todas las demás tablas de public: sin ningún permiso para anon ni
--      authenticated.
--
-- Idempotente.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) products: columnas públicas
-- ---------------------------------------------------------------------

REVOKE ALL ON public.products FROM anon, authenticated;

GRANT SELECT (
  id, barcode, name, category, sale_price, offer_price, image_url, gallery,
  stock, featured, is_active, by_weight, min_stock, optimum_stock,
  measurement_unit, measurement_value, updated_at, created_at, description,
  features, verified_at, expiry_date, promo_1000, costo_cargado
) ON public.products TO anon, authenticated;

-- ---------------------------------------------------------------------
-- 2) categories y settings: sólo lectura
-- ---------------------------------------------------------------------

REVOKE ALL ON public.categories FROM anon, authenticated;
GRANT SELECT ON public.categories TO anon, authenticated;

REVOKE ALL ON public.settings FROM anon, authenticated;
GRANT SELECT ON public.settings TO anon, authenticated;

-- ---------------------------------------------------------------------
-- 3) Todo lo demás: sin acceso directo
-- ---------------------------------------------------------------------

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.relname
      FROM pg_class c
     WHERE c.relnamespace = 'public'::regnamespace
       AND c.relkind IN ('r', 'p', 'v', 'm')
       AND c.relname NOT IN ('products', 'categories', 'settings')
  LOOP
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', r.relname);
  END LOOP;
END $$;

-- Las políticas quedan, pero ya no alcanzan: sin GRANT, RLS ni se consulta.
-- Se borran las dos que daban ESCRITURA a cualquiera, para que no vuelvan a
-- servir si alguien restaura permisos por error.
DROP POLICY IF EXISTS "Allow all operations" ON public.uber_eats_products;
DROP POLICY IF EXISTS "Allow all operations" ON public.uber_eats_stores;

-- ---------------------------------------------------------------------
-- 4) Tablas nuevas: que no nazcan abiertas
-- ---------------------------------------------------------------------
-- Supabase concede por defecto todo a anon y authenticated en cada tabla
-- nueva de public. Desde aquí, una tabla nueva no se puede leer con la clave
-- pública salvo que una migración lo conceda a propósito.

ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
