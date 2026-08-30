-- =====================================================================
-- 20260828000000_products_stock_derivado_por_trigger.sql
--
-- Hace cumplir en la base la doctrina #1: `branch_stock` es la fuente de
-- verdad y `products.stock` es DERIVADO. Hasta ahora era una convención que
-- el código respetaba a mano, y por eso se rompió dos veces.
--
-- QUÉ SE ROMPIÓ, MEDIDO EL 27/08/2026
--
-- Siete funciones (apply_reception, apply_reception_reverse, las dos
-- sobrecargas de apply_sale, apply_transfer, decrement_stock_atomic e
-- increment_product_stock) recalculaban cada una por su cuenta:
--
--     UPDATE products SET stock = (SELECT SUM(stock) FROM branch_stock
--                                   WHERE product_barcode = ...)
--
-- Esa suma no filtra por sucursal activa. "Sucursal 2" —un seed de la
-- migración inicial de `branches`, sin ventas desde su creación— había
-- recibido una copia del inventario de Principal en el resync del 30/07
-- (20260729000000, que se aplicaba "a todas las sucursales activas"). El
-- resultado: `products.stock` pasó a valer el doble del stock real. De 340
-- productos con stock en ambos lados, 255 mostraban cerca del doble, 113
-- exactamente el doble, y ninguno menos.
--
-- Para el cliente eso era: la web ofrece 80 unidades, el checkout descuenta
-- de `branch_stock` de la sucursal por defecto donde hay 42, y el pedido
-- muere con "stock insuficiente" — el mismo síntoma que la migración de
-- julio decía haber arreglado, reaparecido por otra vía.
--
-- POR QUÉ UN TRIGGER Y NO REESCRIBIR LAS SIETE
--
-- Reescribirlas deja la misma fórmula copiada siete veces, que es
-- exactamente la forma en que esto se rompió: basta que la próxima función
-- que mueva stock se olvide del filtro. Con el trigger, la derivación vive
-- en un solo lugar y ninguna escritura puede saltárselo — ni las RPC, ni el
-- panel, ni una consulta a mano. Las siete funciones quedan tal cual: su
-- UPDATE pasa a ser redundante, no incorrecto.
-- =====================================================================

-- El cálculo, en un solo lugar. Filtra por sucursal activa: una sucursal
-- desactivada no tiene mercadería que se pueda vender.
CREATE OR REPLACE FUNCTION public.stock_derivado(p_barcode text)
RETURNS numeric
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(SUM(bs.stock), 0)
    FROM public.branch_stock bs
    JOIN public.branches b ON b.id = bs.branch_id
   WHERE bs.product_barcode = p_barcode
     AND b.is_active = true;
$$;

COMMENT ON FUNCTION public.stock_derivado(text) IS
  'Stock de un producto sumando solo sucursales activas. Es la definicion unica de products.stock, que es derivado de branch_stock.';

-- 1) Nadie puede escribir products.stock con un valor inventado: se
--    reemplaza por el derivado. Las RPC que ya calculaban bien escriben el
--    mismo numero; las que sumaban sucursales inactivas quedan corregidas.
CREATE OR REPLACE FUNCTION public.products_stock_es_derivado()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.stock := public.stock_derivado(NEW.barcode);
  RETURN NEW;
END;
$$;

-- Va tambien en INSERT: un producto creado con stock y sin fila en
-- branch_stock se mostraria en la tienda con existencias que el checkout no
-- puede descontar — el mismo sintoma, por la puerta de al lado. El stock
-- inicial se carga con una recepcion, que es lo que ya hace /api/products.
DROP TRIGGER IF EXISTS products_stock_derivado ON public.products;
CREATE TRIGGER products_stock_derivado
  BEFORE INSERT OR UPDATE OF stock ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.products_stock_es_derivado();

-- 2) Y al reves: mover branch_stock propaga solo, sin depender de que quien
--    lo movio se acuerde de actualizar products. Esto es lo que faltaba
--    cuando el resync de julio escribio branch_stock directamente.
CREATE OR REPLACE FUNCTION public.branch_stock_propaga_a_products()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_barcode text := COALESCE(NEW.product_barcode, OLD.product_barcode);
BEGIN
  UPDATE public.products p
     SET stock = public.stock_derivado(v_barcode),
         updated_at = now()
   WHERE p.barcode = v_barcode
     AND p.stock IS DISTINCT FROM public.stock_derivado(v_barcode);

  RETURN NULL; -- AFTER trigger: el valor de retorno se ignora
END;
$$;

DROP TRIGGER IF EXISTS branch_stock_sync_products ON public.branch_stock;
CREATE TRIGGER branch_stock_sync_products
  AFTER INSERT OR UPDATE OF stock OR DELETE ON public.branch_stock
  FOR EACH ROW
  EXECUTE FUNCTION public.branch_stock_propaga_a_products();

-- Permisos: mismo patron que el resto de las funciones del proyecto. Revocar
-- de PUBLIC, no solo de anon/authenticated, que heredan de ahi (doctrina #7).
REVOKE ALL ON FUNCTION public.stock_derivado(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.stock_derivado(text) TO service_role;
REVOKE ALL ON FUNCTION public.products_stock_es_derivado() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.branch_stock_propaga_a_products() FROM PUBLIC, anon, authenticated;

-- Reconciliacion puntual: deja los 730 productos activos alineados al
-- criterio nuevo. Es idempotente y no depende del estado previo.
UPDATE public.products p
   SET stock = public.stock_derivado(p.barcode),
       updated_at = now()
 WHERE p.stock IS DISTINCT FROM public.stock_derivado(p.barcode);
