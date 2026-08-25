-- Columnas de envío inmediato (Uber Direct) en `orders`.
--
-- Estas columnas YA EXISTEN en la base: se aplicaron a mano desde el PR #56
-- sin dejar archivo de migración, así que el historial del repo no las
-- registraba. Cualquiera que levantara el proyecto desde cero obtenía un
-- esquema distinto al de producción, y sin forma de saberlo hasta que algo
-- fallara en tiempo de ejecución.
--
-- Esta migración es idempotente a propósito: sobre la base actual no cambia
-- nada, y sobre una base nueva deja el mismo esquema que producción.
--
-- El código que las usa vive en el PR #56, todavía sin mergear. Las columnas
-- son todas nullable, así que su presencia no afecta a ninguna orden que no
-- sea de envío inmediato.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS express_delivery_id   text,
  ADD COLUMN IF NOT EXISTS express_tracking_url  text,
  ADD COLUMN IF NOT EXISTS express_status        text,
  ADD COLUMN IF NOT EXISTS express_fee           numeric,
  ADD COLUMN IF NOT EXISTS express_fee_paid_by   text;

COMMENT ON COLUMN public.orders.express_delivery_id  IS 'Id del envío en Uber Direct. Único: da idempotencia al webhook de pago.';
COMMENT ON COLUMN public.orders.express_tracking_url IS 'Enlace de seguimiento que se le manda al cliente.';
COMMENT ON COLUMN public.orders.express_status       IS 'Último estado informado por Uber. "failed" = pagado y sin repartidor: lo resuelve operaciones.';
COMMENT ON COLUMN public.orders.express_fee          IS 'Tarifa que cobra Uber, en CLP. Puede diferir de lo que pagó el cliente.';
COMMENT ON COLUMN public.orders.express_fee_paid_by  IS '"store" cuando la tienda absorbe la tarifa, "customer" cuando la paga el cliente.';

-- Idempotencia del webhook de pago: dos entregas del mismo evento no pueden
-- terminar pidiendo dos repartidores para la misma orden.
CREATE UNIQUE INDEX IF NOT EXISTS orders_express_delivery_id_key
  ON public.orders (express_delivery_id)
  WHERE express_delivery_id IS NOT NULL;

-- Envíos en curso: es la consulta que hace el panel de operaciones, y son
-- pocas filas frente al total de órdenes.
CREATE INDEX IF NOT EXISTS orders_express_in_progress_idx
  ON public.orders (express_status)
  WHERE express_status IS NOT NULL
    AND express_status NOT IN ('delivered', 'canceled', 'returned');
