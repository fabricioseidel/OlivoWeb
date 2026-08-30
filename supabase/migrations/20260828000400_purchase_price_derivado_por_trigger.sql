-- =====================================================================
-- 20260828000400_purchase_price_derivado_por_trigger.sql
--
-- Cierra en `products.purchase_price` el mismo hueco que
-- `20260828000000` cerró en `products.stock`.
--
-- EL HUECO
--
-- #72 dejó `purchase_price` derivado del proveedor preferido, pero el trigger
-- que lo mantiene (`product_suppliers_sync_purchase_price`) está sobre
-- **`product_suppliers`**: se dispara cuando cambia un costo, no cuando alguien
-- escribe `products.purchase_price` directamente.
--
-- El editor masivo lo escribe (`edicion-masiva/page.tsx` manda
-- `purchase_price` en cada guardado). El traspaso lo daba por inofensivo
-- —"con el trigger de #72 se recalcula igual"— y **eso no es exacto**: se
-- recalcula recién la próxima vez que alguien toque el costo de ese proveedor.
-- Hasta entonces el margen de ese producto se calcula contra una cifra vieja.
-- Es el mismo error que tenía el stock, en la columna de al lado.
--
-- LA EXCEPCIÓN QUE HAY QUE RESPETAR
--
-- `sincronizar_purchase_price` **no** deriva a NULL los productos sin
-- proveedor con costo, y es deliberado: para buena parte del catálogo esa
-- cifra cargada a mano es el único dato de costo que existe. Este trigger
-- mantiene esa regla — sólo pisa el valor cuando hay un proveedor preferido
-- con costo del cual derivar. Sin proveedor, lo que se escribe queda.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.products_purchase_price_es_derivado()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_costo numeric;
BEGIN
  v_costo := public.costo_del_proveedor_preferido(NEW.barcode);

  -- Sin proveedor con costo no hay nada de donde derivar: el valor a mano es
  -- el unico dato que existe y se respeta (misma regla que #72).
  IF v_costo IS NOT NULL THEN
    NEW.purchase_price := v_costo;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.products_purchase_price_es_derivado() IS
  'Hace cumplir que products.purchase_price es derivado del proveedor preferido. Respeta la excepcion de #72: si el producto no tiene proveedor con costo, conserva el valor cargado a mano.';

DROP TRIGGER IF EXISTS products_purchase_price_derivado ON public.products;
CREATE TRIGGER products_purchase_price_derivado
  BEFORE INSERT OR UPDATE OF purchase_price ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.products_purchase_price_es_derivado();

REVOKE ALL ON FUNCTION public.products_purchase_price_es_derivado()
  FROM PUBLIC, anon, authenticated;

-- Reconciliacion: deja alineado lo que haya quedado desfasado. Sólo toca los
-- que tienen proveedor con costo, por la misma razon de arriba.
UPDATE public.products p
   SET purchase_price = public.costo_del_proveedor_preferido(p.barcode)
 WHERE public.costo_del_proveedor_preferido(p.barcode) IS NOT NULL
   AND p.purchase_price IS DISTINCT FROM public.costo_del_proveedor_preferido(p.barcode);
