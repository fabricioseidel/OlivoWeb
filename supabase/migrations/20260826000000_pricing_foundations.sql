-- =====================================================================
-- 20260826000000_pricing_foundations.sql
--
-- Cimientos del precio (Fase 1 de docs/PLAN_PRECIOS.md).
--
-- Qué problema resuelve
-- ---------------------
-- `product_suppliers.unit_cost` guarda el costo SIN IVA. Eso no estaba escrito
-- en ninguna parte: se deducía de `unitCost: ps.priceWithoutVat` en la pantalla
-- de producto. El motor de reposición sumaba esos netos y los presentaba como
-- el total a pagar, así que todo pedido se veía un 19% más barato de lo que
-- costaba. En un pedido de $400.000 son $76.000 de sorpresa.
--
-- Decisiones que fija esta migración
-- ----------------------------------
-- 1. `unit_cost` sigue siendo EL costo, y es NETO. No se agrega una segunda
--    columna editable con el bruto: dos costos editables para el mismo producto
--    es exactamente el problema que hay que evitar. El bruto se DERIVA en una
--    columna generada, así que no puede desincronizarse nunca.
-- 2. La tasa se guarda por línea (`tax_rate`) en vez de asumir 19 en el código.
--    Hay productos exentos y el IVA ha cambiado antes.
-- 3. El historial de costos lo escribe un trigger, no cada pantalla. Si depende
--    de que alguien se acuerde de registrarlo, no existe.
--
-- Idempotente: se puede aplicar varias veces sin efecto.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Costo de proveedor: tasa explícita y bruto derivado
-- ---------------------------------------------------------------------

ALTER TABLE public.product_suppliers
  ADD COLUMN IF NOT EXISTS tax_rate numeric(5,2) NOT NULL DEFAULT 19;

COMMENT ON COLUMN public.product_suppliers.unit_cost IS
  'Costo unitario SIN IVA (neto), en pesos. El precio con IVA se lee de unit_cost_gross, que es derivado.';

COMMENT ON COLUMN public.product_suppliers.tax_rate IS
  'IVA aplicable a este costo, en porcentaje. 19 = IVA general chileno; 0 para productos exentos.';

-- Columna generada: no se puede escribir, así que no puede quedar desalineada.
-- Sin COALESCE a propósito: si no hay costo, el bruto tiene que quedar NULL.
-- Un 0 aquí se leería como "cuesta cero" y haría que el filtro de productos
-- vendidos bajo el costo dé por sano un producto del que no se sabe el costo.
ALTER TABLE public.product_suppliers
  ADD COLUMN IF NOT EXISTS unit_cost_gross numeric(12,2)
  GENERATED ALWAYS AS (ROUND(unit_cost * (1 + COALESCE(tax_rate, 19) / 100), 2)) STORED;

COMMENT ON COLUMN public.product_suppliers.unit_cost_gross IS
  'Costo unitario CON IVA. Derivado de unit_cost y tax_rate — es lo que realmente se paga por unidad. NULL cuando no hay costo cargado.';

-- Cuándo y de dónde salió este costo. Sin esto no se puede distinguir un costo
-- confirmado al recibir mercadería de uno tecleado hace un año.
ALTER TABLE public.product_suppliers
  ADD COLUMN IF NOT EXISTS cost_updated_at timestamptz;

ALTER TABLE public.product_suppliers
  ADD COLUMN IF NOT EXISTS cost_source text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'product_suppliers_cost_source_check'
      AND conrelid = 'public.product_suppliers'::regclass
  ) THEN
    ALTER TABLE public.product_suppliers
      ADD CONSTRAINT product_suppliers_cost_source_check
      CHECK (cost_source IS NULL OR cost_source IN ('manual', 'recepcion', 'importacion', 'pedido'));
  END IF;
END $$;

COMMENT ON COLUMN public.product_suppliers.cost_source IS
  'Cómo se supo este costo: manual (tecleado), recepcion (confirmado al recibir), importacion (carga masiva), pedido (factura del proveedor).';

-- Los costos que ya existen se marcan como tecleados a mano en su última
-- edición conocida. Es lo que son: no hay forma de saber más.
UPDATE public.product_suppliers
   SET cost_updated_at = COALESCE(updated_at, created_at, now()),
       cost_source = 'manual'
 WHERE unit_cost IS NOT NULL
   AND cost_updated_at IS NULL;

-- ---------------------------------------------------------------------
-- 2) Historial de costos
-- ---------------------------------------------------------------------
-- Hoy, cuando un proveedor sube un precio, el anterior se pierde. Sin el
-- anterior no se puede detectar la variación, que es justo lo que hay que ver.

CREATE TABLE IF NOT EXISTS public.supplier_cost_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Misma llave que product_suppliers.product_id: el código de barras.
  -- (supplier_order_items usa products.id en su lugar; son dos llaves distintas
  --  en el mismo módulo, anotado en el plan para la Fase 3.)
  product_barcode text NOT NULL,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,

  unit_cost numeric NOT NULL,           -- neto, igual que product_suppliers
  tax_rate numeric(5,2) NOT NULL DEFAULT 19,
  previous_unit_cost numeric,           -- NULL en el primer registro

  source text,
  note text,
  recorded_by uuid,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.supplier_cost_history IS
  'Un registro por cada vez que cambia el costo de un producto en un proveedor. Lo escribe un trigger sobre product_suppliers.';

CREATE INDEX IF NOT EXISTS idx_supplier_cost_history_producto
  ON public.supplier_cost_history(product_barcode, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_supplier_cost_history_proveedor
  ON public.supplier_cost_history(supplier_id, recorded_at DESC);

-- El trigger: cualquier escritura de costo queda registrada, venga de donde venga.
CREATE OR REPLACE FUNCTION public.record_supplier_cost_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.unit_cost IS NULL THEN
    RETURN NEW;
  END IF;

  -- En UPDATE sólo interesa cuando el costo o la tasa cambian de verdad.
  IF TG_OP = 'UPDATE'
     AND OLD.unit_cost IS NOT DISTINCT FROM NEW.unit_cost
     AND OLD.tax_rate IS NOT DISTINCT FROM NEW.tax_rate THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.supplier_cost_history (
    product_barcode, supplier_id, unit_cost, tax_rate, previous_unit_cost, source
  ) VALUES (
    NEW.product_id,
    NEW.supplier_id,
    NEW.unit_cost,
    COALESCE(NEW.tax_rate, 19),
    CASE WHEN TG_OP = 'UPDATE' THEN OLD.unit_cost ELSE NULL END,
    COALESCE(NEW.cost_source, 'manual')
  );

  RETURN NEW;
END;
$$;

-- Los roles de Supabase no existen en un PostgreSQL local, así que la
-- revocación va guardada: sin esto la migración aborta antes de terminar.
--
-- Se revoca de `anon` y `authenticated`, NO de PUBLIC, siguiendo lo que ya hace
-- 20260814033833: `service_role` puede estar apoyándose en el permiso de
-- PUBLIC, y quitárselo dejaría al servidor sin poder llamar su propia función.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE EXECUTE ON FUNCTION public.record_supplier_cost_change() FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE EXECUTE ON FUNCTION public.record_supplier_cost_change() FROM authenticated;
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_record_supplier_cost_change ON public.product_suppliers;
CREATE TRIGGER trg_record_supplier_cost_change
AFTER INSERT OR UPDATE OF unit_cost, tax_rate ON public.product_suppliers
FOR EACH ROW
EXECUTE FUNCTION public.record_supplier_cost_change();

-- Punto de partida: el costo vigente de cada línea entra como primer registro,
-- para que la primera variación detectada tenga contra qué compararse.
INSERT INTO public.supplier_cost_history (
  product_barcode, supplier_id, unit_cost, tax_rate, previous_unit_cost, source, note, recorded_at
)
SELECT ps.product_id, ps.supplier_id, ps.unit_cost, COALESCE(ps.tax_rate, 19), NULL,
       'manual', 'Costo vigente al crear el historial',
       COALESCE(ps.cost_updated_at, ps.updated_at, ps.created_at, now())
  FROM public.product_suppliers ps
 WHERE ps.unit_cost IS NOT NULL
   AND NOT EXISTS (
     SELECT 1 FROM public.supplier_cost_history h
      WHERE h.product_barcode = ps.product_id
        AND h.supplier_id = ps.supplier_id
   );

-- ---------------------------------------------------------------------
-- 3) Margen por categoría
-- ---------------------------------------------------------------------
-- Las bebidas no aguantan el mismo margen que un producto de nicho. Un único
-- 35% para todo marca como problema cosas que no lo son.

CREATE TABLE IF NOT EXISTS public.category_margins (
  category text PRIMARY KEY,
  margin numeric(4,3) NOT NULL CHECK (margin >= 0 AND margin < 1),
  rounding text NOT NULL DEFAULT 'decena'
    CHECK (rounding IN ('ninguno', 'decena', 'terminacion90', 'centena')),
  note text,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.category_margins IS
  'Margen bruto objetivo por categoría. La fila __default__ es el respaldo para categorías sin regla propia.';
COMMENT ON COLUMN public.category_margins.margin IS
  'Margen sobre el PRECIO DE VENTA, no sobre el costo. 0.35 significa vender a costo_bruto/0.65.';

-- El 35% que hasta ahora estaba escrito a mano en dos componentes React.
INSERT INTO public.category_margins (category, margin, rounding, note)
VALUES ('__default__', 0.350, 'decena', 'Margen histórico del local; ajustar por categoría cuando se defina')
ON CONFLICT (category) DO NOTHING;

DROP TRIGGER IF EXISTS set_category_margins_updated_at ON public.category_margins;
CREATE TRIGGER set_category_margins_updated_at
BEFORE UPDATE ON public.category_margins
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------
-- 4) Revisión del precio de venta
-- ---------------------------------------------------------------------
-- El circuito que falta: el costo cambia -> el precio vuelve a revisión.
-- Sin marca de revisión no se puede distinguir "precio pensado" de "precio que
-- quedó ahí".

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS price_reviewed_at timestamptz;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS price_reviewed_by uuid;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS margin_override numeric(4,3);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'products_margin_override_check'
      AND conrelid = 'public.products'::regclass
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_margin_override_check
      CHECK (margin_override IS NULL OR (margin_override >= 0 AND margin_override < 1));
  END IF;
END $$;

COMMENT ON COLUMN public.products.price_reviewed_at IS
  'Cuándo se revisó por última vez el precio de venta contra el costo. NULL = nunca revisado.';
COMMENT ON COLUMN public.products.margin_override IS
  'Margen propio de este producto, si difiere del de su categoría. NULL = usa category_margins.';

-- Deliberadamente NO se rellena price_reviewed_at con una fecha inventada: los
-- precios actuales no fueron revisados contra su costo, y decir que sí haría
-- que la pantalla de precios arranque mintiendo.

-- ---------------------------------------------------------------------
-- 5) purchase_price: qué es y qué no
-- ---------------------------------------------------------------------
COMMENT ON COLUMN public.products.purchase_price IS
  'Costo de referencia global SIN IVA, heredado. El costo real por proveedor vive en product_suppliers.unit_cost; cuando hay varios proveedores este valor no representa a ninguno.';
