-- =====================================================================
-- 20260912010000_movimientos_de_caja_idempotentes.sql
--
-- Cierra el último hueco de idempotencia del POS.
--
-- El outbox del mostrador reencola cualquier escritura cuyo `fetch` falle por
-- red, y una respuesta que no llega por timeout es indistinguible de una
-- petición que nunca salió. Las ventas están protegidas desde siempre
-- (`p_client_sale_id`), y las recepciones, traspasos y conteos desde
-- `20260910000000` (`stock_ops.op_id`). Los movimientos manuales de caja eran
-- los únicos que quedaban: un ingreso de efectivo reintentado entraba dos
-- veces y el arqueo del turno no cuadraba, con la plata "sobrando" en el
-- sistema y no en el cajón.
--
-- La solución es la que ya pedía el plan de agosto: un uuid de cliente y un
-- índice único. Se resuelve en la tabla y no con una tabla de operaciones
-- aparte, porque acá hay una fila por movimiento —a diferencia de un lote de
-- conteo, que toca muchas— y el índice es a la vez la deduplicación y el
-- rastro de qué operación del teléfono lo creó.
--
-- El índice es parcial: los movimientos viejos y los que se creen desde el
-- panel (que no pasan por el outbox) tienen `client_op_id` NULL y no compiten
-- entre sí.
-- =====================================================================

ALTER TABLE public.cash_movements
  ADD COLUMN IF NOT EXISTS client_op_id text;

COMMENT ON COLUMN public.cash_movements.client_op_id IS
  'UUID generado en el cliente para deduplicar el reintento del outbox. NULL en los movimientos que no vienen del POS.';

CREATE UNIQUE INDEX IF NOT EXISTS cash_movements_client_op_id_key
  ON public.cash_movements (client_op_id)
  WHERE client_op_id IS NOT NULL;
