-- =====================================================================
-- 20260826000200_purchase_cycle.sql
--
-- Ciclo de compra (Fase 3 de docs/PLAN_PRECIOS.md).
--
-- Tres problemas distintos, todos del mismo origen: el pedido salta de
-- "enviado" a "recibido" sin que la base pueda registrar qué pasó en el medio.
--
-- 1) LO QUE ENTRA AL STOCK ES LO QUE SE PIDIÓ, NO LO QUE LLEGÓ
--    Al marcar un pedido como recibido, el stock se mueve con
--    `supplier_order_items.quantity` — la cantidad PEDIDA. Si se pidieron 24 y
--    llegaron 18, entran 24 al inventario y el sistema queda mintiendo por 6
--    unidades que nadie tiene. Hoy no hay dónde anotar lo que realmente llegó.
--
-- 2) UN CHECK IMPIDE ANOTAR LO QUE SE FACTURÓ
--    `CHECK (subtotal = quantity * unit_cost)` obliga a que el subtotal sea
--    exactamente el producto. "Pedí 24, llegaron 18, me cobraron otro precio"
--    no cabe, y tampoco cabe un descuento por volumen ni un redondeo del
--    proveedor.
--
-- 3) EL ESTADO MEZCLA EL PUNTO DEL FLUJO CON EL CANAL
--    `enviado_por_whatsapp` responde dos preguntas a la vez: dónde va el
--    pedido y cómo se compró. Eso obliga a inventar un estado por cada canal
--    nuevo — 'enviado_por_email', 'enviado_por_telefono'— y a que ningún
--    informe pueda contar "cuántos pedidos están enviados" sin enumerarlos
--    todos. Son dos columnas: `status` y `channel`.
--
-- Idempotente.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) El canal sale del estado
-- ---------------------------------------------------------------------

ALTER TABLE public.supplier_orders
  ADD COLUMN IF NOT EXISTS channel text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'supplier_orders_channel_check'
      AND conrelid = 'public.supplier_orders'::regclass
  ) THEN
    ALTER TABLE public.supplier_orders
      ADD CONSTRAINT supplier_orders_channel_check
      CHECK (channel IS NULL OR channel IN ('whatsapp', 'online', 'presencial', 'telefono'));
  END IF;
END $$;

COMMENT ON COLUMN public.supplier_orders.channel IS
  'Cómo se compró: whatsapp, online, presencial o telefono. Independiente de status, que dice en qué punto del flujo va.';

ALTER TABLE public.supplier_orders
  ADD COLUMN IF NOT EXISTS sent_at timestamptz;
ALTER TABLE public.supplier_orders
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;
ALTER TABLE public.supplier_orders
  ADD COLUMN IF NOT EXISTS reviewed_by uuid;

COMMENT ON COLUMN public.supplier_orders.reviewed_at IS
  'Cuándo se revisó el pedido antes de mandarlo. NULL = todavía no pasó por revisión.';

-- Primero se amplía el CHECK para que 'enviado' sea válido, y sólo después se
-- migran las filas. Al revés, el UPDATE fallaría contra el CHECK viejo.
ALTER TABLE public.supplier_orders
  DROP CONSTRAINT IF EXISTS supplier_orders_status_check;

ALTER TABLE public.supplier_orders
  ADD CONSTRAINT supplier_orders_status_check
  CHECK (status = ANY (ARRAY[
    'borrador'::text,        -- generado por el motor, sin mirar
    'en_revision'::text,     -- alguien lo está revisando antes de mandarlo
    'pendiente'::text,
    'enviado'::text,         -- salió al proveedor (por el canal de `channel`)
    'confirmado'::text,      -- el proveedor confirmó qué tiene
    'gestionado'::text,
    'recibido'::text,
    'cancelado'::text,
    'enviado_por_whatsapp'::text  -- heredado; se retira más abajo
  ]));

-- El canal que estaba escondido dentro del estado pasa a su columna.
UPDATE public.supplier_orders
   SET status = 'enviado',
       channel = COALESCE(channel, 'whatsapp'),
       sent_at = COALESCE(sent_at, updated_at, order_date)
 WHERE status = 'enviado_por_whatsapp';

-- Ya no queda ninguna fila con el estado viejo: se retira del CHECK para que
-- nadie vuelva a escribirlo. Dejarlo aceptado invita a seguir usándolo.
ALTER TABLE public.supplier_orders
  DROP CONSTRAINT IF EXISTS supplier_orders_status_check;

ALTER TABLE public.supplier_orders
  ADD CONSTRAINT supplier_orders_status_check
  CHECK (status = ANY (ARRAY[
    'borrador'::text,
    'en_revision'::text,
    'pendiente'::text,
    'enviado'::text,
    'confirmado'::text,
    'gestionado'::text,
    'recibido'::text,
    'cancelado'::text
  ]));

COMMENT ON COLUMN public.supplier_orders.status IS
  'Punto del flujo: borrador, en_revision, pendiente, enviado, confirmado, gestionado, recibido, cancelado. El canal va aparte, en channel.';

CREATE INDEX IF NOT EXISTS idx_supplier_orders_channel
  ON public.supplier_orders(channel) WHERE channel IS NOT NULL;

-- ---------------------------------------------------------------------
-- 2) Qué tenía el proveedor, y qué llegó de verdad
-- ---------------------------------------------------------------------

ALTER TABLE public.supplier_order_items
  ADD COLUMN IF NOT EXISTS qty_confirmed integer;
ALTER TABLE public.supplier_order_items
  ADD COLUMN IF NOT EXISTS availability text NOT NULL DEFAULT 'pendiente';
ALTER TABLE public.supplier_order_items
  ADD COLUMN IF NOT EXISTS qty_received integer;
ALTER TABLE public.supplier_order_items
  ADD COLUMN IF NOT EXISTS unit_cost_received numeric(10,2);
ALTER TABLE public.supplier_order_items
  ADD COLUMN IF NOT EXISTS received_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'supplier_order_items_availability_check'
      AND conrelid = 'public.supplier_order_items'::regclass
  ) THEN
    ALTER TABLE public.supplier_order_items
      ADD CONSTRAINT supplier_order_items_availability_check
      CHECK (availability IN ('pendiente', 'disponible', 'parcial', 'sin_stock'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'supplier_order_items_qty_received_check'
      AND conrelid = 'public.supplier_order_items'::regclass
  ) THEN
    ALTER TABLE public.supplier_order_items
      ADD CONSTRAINT supplier_order_items_qty_received_check
      CHECK (qty_received IS NULL OR qty_received >= 0);
  END IF;
END $$;

COMMENT ON COLUMN public.supplier_order_items.quantity IS
  'Cantidad PEDIDA. Lo que confirmó el proveedor está en qty_confirmed y lo que llegó en qty_received; los tres se guardan por separado a propósito, para poder ver la diferencia.';
COMMENT ON COLUMN public.supplier_order_items.qty_confirmed IS
  'Lo que el proveedor dijo que tenía. NULL = todavía no se le preguntó.';
COMMENT ON COLUMN public.supplier_order_items.availability IS
  'Qué contestó el proveedor: pendiente (sin preguntar), disponible, parcial o sin_stock.';
COMMENT ON COLUMN public.supplier_order_items.qty_received IS
  'Lo que realmente llegó. Es lo que entra al inventario; NULL antes de recibir.';
COMMENT ON COLUMN public.supplier_order_items.unit_cost_received IS
  'Costo unitario SIN IVA que figura en la factura. Comparado con unit_cost detecta que el proveedor cambió el precio.';

-- ---------------------------------------------------------------------
-- 3) El CHECK que impedía anotar lo facturado
-- ---------------------------------------------------------------------
-- `subtotal = quantity * unit_cost` no admite un descuento por volumen, ni un
-- redondeo del proveedor, ni una factura que no cuadre exactamente con la
-- multiplicación. Se cambia por la única condición que sí es siempre cierta.

ALTER TABLE public.supplier_order_items
  DROP CONSTRAINT IF EXISTS valid_subtotal;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'supplier_order_items_subtotal_check'
      AND conrelid = 'public.supplier_order_items'::regclass
  ) THEN
    ALTER TABLE public.supplier_order_items
      ADD CONSTRAINT supplier_order_items_subtotal_check
      CHECK (subtotal >= 0);
  END IF;
END $$;

COMMENT ON COLUMN public.supplier_order_items.subtotal IS
  'Subtotal NETO de la línea. Normalmente quantity * unit_cost, pero puede diferir: descuento por volumen, redondeo del proveedor o una factura que no cuadra con la multiplicación.';

-- ---------------------------------------------------------------------
-- 4) Estado de la revisión previa al envío
-- ---------------------------------------------------------------------
-- El pedido nace 'borrador' desde el motor. Antes se mandaba tal cual; ahora
-- pasa por revisión, y de ahí sale por uno de los cuatro canales.

CREATE OR REPLACE FUNCTION public.marcar_pedido_enviado(
  p_order_id uuid,
  p_channel text,
  p_user uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_previo text;
BEGIN
  IF p_channel NOT IN ('whatsapp', 'online', 'presencial', 'telefono') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Canal desconocido: ' || p_channel);
  END IF;

  SELECT status INTO v_previo FROM public.supplier_orders WHERE id = p_order_id;

  IF v_previo IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'El pedido no existe');
  END IF;

  -- Un pedido ya recibido o cancelado no vuelve a "enviado": marcarlo otra vez
  -- borraría el canal por el que realmente se compró.
  IF v_previo IN ('recibido', 'cancelado') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'El pedido ya está ' || v_previo);
  END IF;

  UPDATE public.supplier_orders
     SET status = 'enviado',
         channel = p_channel,
         sent_at = COALESCE(sent_at, now()),
         reviewed_at = COALESCE(reviewed_at, now()),
         reviewed_by = COALESCE(reviewed_by, p_user)
   WHERE id = p_order_id;

  RETURN jsonb_build_object('ok', true, 'status', 'enviado', 'channel', p_channel);
END;
$$;

-- CORREGIDO: ver la nota igual de larga en 20260826000000_pricing_foundations.sql
-- sobre record_supplier_cost_change — el mismo error, el mismo arreglo.
-- Revocar de `anon`/`authenticated` directamente no quita lo que esos roles
-- heredan de PUBLIC; hay que revocar de PUBLIC y conceder explícito a
-- service_role.
DO $$
DECLARE
  v_fn regprocedure := 'public.marcar_pedido_enviado(uuid, text, uuid)'::regprocedure;
BEGIN
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', v_fn);
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', v_fn);
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', v_fn);
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', v_fn);
  END IF;
END $$;
