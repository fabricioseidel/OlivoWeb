-- =====================================================================
-- 20260827000000_costo_derivado_del_proveedor.sql
--
-- `products.purchase_price` deja de ser un número suelto y pasa a ser el
-- costo del proveedor preferido.
--
-- EL PROBLEMA
-- Hay dos columnas que dicen "lo que me cuesta este producto":
--
--   product_suppliers.unit_cost  → por proveedor, y la recepción la reescribe
--                                  con lo que dice la factura (ver la Fase 3)
--   products.purchase_price      → global, una sola, y NADIE la actualiza
--
-- No es un desfase fijo: es un trinquete. Cada recepción mueve la primera y
-- deja la segunda donde estaba, así que cuanto mejor se use el sistema, más
-- se separan.
--
-- El daño concreto no es el pedido a proveedor —la API de productos por
-- proveedor ya prefiere `unit_cost` cuando existe— sino el respaldo: cuando
-- ese proveedor no tiene costo cargado, se sirve `purchase_price` en su lugar,
-- y quien lo mira no puede distinguir "esto cobra este proveedor" de "esto es
-- un número viejo que quedó dando vueltas".
--
-- LA DECISIÓN
-- Manda `product_suppliers.unit_cost`. Es el que tiene historial, el que el
-- trigger de la Fase 1 versiona y el que la recepción confirma contra factura.
-- "Costo global" además es un concepto que no cierra: si un producto se compra
-- a dos proveedores a precios distintos, no existe un número global correcto.
-- Se elige el del proveedor PREFERIDO — el de menor `priority` que tenga costo
-- cargado—, que es exactamente el criterio que ya usa `elegirPreferido()` en
-- src/server/pricing.service.ts.
--
-- LO QUE NO HACE, A PROPÓSITO
-- Si un producto NO tiene ningún proveedor con costo, la columna se deja
-- intacta. Hay productos en el catálogo cuyo único dato de costo es ese valor
-- cargado a mano; derivarlos a NULL sería borrar la única cifra que existe.
-- Vale más un número viejo declarado que ninguno.
--
-- Idempotente.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) El costo del proveedor preferido
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.costo_del_proveedor_preferido(p_barcode text)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT ps.unit_cost
    FROM public.product_suppliers ps
   WHERE ps.product_id = p_barcode
     AND ps.unit_cost IS NOT NULL
   -- Mismo orden que elegirPreferido(): prioridad ascendente, y los que no
   -- declaran prioridad van al final en vez de colarse primero.
   ORDER BY COALESCE(ps.priority, 2147483647) ASC, ps.unit_cost ASC
   LIMIT 1;
$$;

COMMENT ON FUNCTION public.costo_del_proveedor_preferido(text) IS
  'Costo NETO del proveedor preferido de un producto: el de menor priority que tenga unit_cost. NULL si ninguno lo tiene.';

-- ---------------------------------------------------------------------
-- 2) Sincronizar la columna derivada
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sincronizar_purchase_price(p_barcode text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_costo numeric;
BEGIN
  IF p_barcode IS NULL THEN RETURN; END IF;

  v_costo := public.costo_del_proveedor_preferido(p_barcode);

  -- Sin costo de proveedor no se toca nada: ver la nota de arriba sobre por
  -- qué no se borra el valor heredado.
  IF v_costo IS NULL THEN RETURN; END IF;

  UPDATE public.products
     SET purchase_price = v_costo
   WHERE barcode = p_barcode
     -- Evita escrituras (y updated_at) cuando ya coincide.
     AND (purchase_price IS DISTINCT FROM v_costo);
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_sincronizar_purchase_price()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- En un UPDATE que cambie de producto hay que recalcular los dos lados.
  IF TG_OP = 'DELETE' THEN
    PERFORM public.sincronizar_purchase_price(OLD.product_id);
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.product_id IS DISTINCT FROM NEW.product_id THEN
    PERFORM public.sincronizar_purchase_price(OLD.product_id);
  END IF;

  PERFORM public.sincronizar_purchase_price(NEW.product_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS product_suppliers_sync_purchase_price ON public.product_suppliers;

CREATE TRIGGER product_suppliers_sync_purchase_price
  AFTER INSERT OR DELETE OR UPDATE OF unit_cost, priority, product_id
  ON public.product_suppliers
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_sincronizar_purchase_price();

-- ---------------------------------------------------------------------
-- 3) Poner al día lo que ya está cargado
-- ---------------------------------------------------------------------

UPDATE public.products p
   SET purchase_price = c.costo
  FROM (
    SELECT DISTINCT ON (ps.product_id)
           ps.product_id,
           ps.unit_cost AS costo
      FROM public.product_suppliers ps
     WHERE ps.unit_cost IS NOT NULL
     ORDER BY ps.product_id,
              COALESCE(ps.priority, 2147483647) ASC,
              ps.unit_cost ASC
  ) c
 WHERE p.barcode = c.product_id
   AND p.purchase_price IS DISTINCT FROM c.costo;

COMMENT ON COLUMN public.products.purchase_price IS
  'DERIVADA: costo NETO del proveedor preferido, mantenida por el trigger product_suppliers_sync_purchase_price. No se edita a mano — el costo se carga en product_suppliers.unit_cost, que es el que tiene historial y el que confirma la recepción. Sólo conserva un valor propio en productos sin ningún proveedor con costo.';

-- ---------------------------------------------------------------------
-- 4) Permisos
-- ---------------------------------------------------------------------
-- Mismo criterio que el resto: revocar de PUBLIC (de donde anon y
-- authenticated heredan) y conceder explícito a service_role.

DO $$
DECLARE
  v_fns text[] := ARRAY[
    'public.costo_del_proveedor_preferido(text)',
    'public.sincronizar_purchase_price(text)',
    'public.trg_sincronizar_purchase_price()'
  ];
  v_fn text;
  v_reg regprocedure;
BEGIN
  FOREACH v_fn IN ARRAY v_fns LOOP
    v_reg := v_fn::regprocedure;
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', v_reg);
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', v_reg);
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', v_reg);
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', v_reg);
    END IF;
  END LOOP;
END $$;
