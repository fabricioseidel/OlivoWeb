-- =====================================================================
-- 20260828000100_order_items_fk_a_products.sql
--
-- Cierra la "trampa de las tres llaves" del lado que faltaba.
--
-- El catálogo tiene dos identificadores por producto y las tablas que lo
-- referencian usan uno u otro:
--
--   product_suppliers.product_id  (text)   -> products.barcode   con FK
--   supplier_order_items.product_id (bigint) -> products.id      con FK
--   sale_items.product_barcode    (text)   -> products.barcode   por convención
--   order_items.product_id        (text)   -> products.id        SIN NADA
--
-- La última es la peligrosa: guarda un `bigint` dentro de una columna `text`
-- y no tiene clave foránea, así que la base acepta cualquier cosa. Ya mordió
-- dos veces en una sola sesión —el motor de aprendizaje y el webhook de pago,
-- que pedía un embed `order_items -> products(barcode)` imposible— porque el
-- POS anota por código de barras y la web por id numérico, y sumarlos sin
-- traducir no falla ni avisa: acumula bajo una clave que ningún producto tiene.
--
-- Medido antes de migrar: 19 líneas, las 19 casan con `products.id`, ninguna
-- con un barcode, ninguna huérfana y ninguna no numérica. La conversión no
-- pierde nada.
--
-- ON DELETE RESTRICT y no CASCADE: una línea de pedido es historial de venta.
-- Que borrar un producto se lleve puesto el registro de que alguien lo compró
-- es peor que no poder borrarlo — para eso está `is_active`.
-- =====================================================================

-- Cinturón antes de convertir: si quedara una fila que no casa, la migración
-- para acá con un mensaje claro en vez de romper a mitad de camino.
DO $$
DECLARE
  v_malas integer;
BEGIN
  SELECT count(*) INTO v_malas
    FROM public.order_items oi
   WHERE oi.product_id !~ '^[0-9]+$'
      OR NOT EXISTS (SELECT 1 FROM public.products p WHERE p.id::text = oi.product_id);

  IF v_malas > 0 THEN
    RAISE EXCEPTION
      'order_items: % filas no apuntan a un products.id valido. Hay que revisarlas a mano antes de poner la clave foranea.',
      v_malas;
  END IF;
END $$;

ALTER TABLE public.order_items
  ALTER COLUMN product_id TYPE bigint USING product_id::bigint;

ALTER TABLE public.order_items
  DROP CONSTRAINT IF EXISTS order_items_product_id_fkey;

ALTER TABLE public.order_items
  ADD CONSTRAINT order_items_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES public.products(id)
  ON DELETE RESTRICT;

COMMENT ON COLUMN public.order_items.product_id IS
  'products.id (bigint), no el codigo de barras. El POS usa products.barcode en sale_items: cruzar las dos tablas sin traducir da cero coincidencias.';

-- La FK crea el indice del lado de products, no del de order_items. Sin este,
-- borrar o actualizar un producto recorre la tabla entera para comprobar la
-- restriccion, y es lo que el linter de Supabase reporta como
-- "unindexed foreign key".
CREATE INDEX IF NOT EXISTS idx_order_items_product_id
  ON public.order_items(product_id);
