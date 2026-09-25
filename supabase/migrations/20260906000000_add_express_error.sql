-- Motivo por el que Uber rechazó la entrega.
--
-- Sin esto la orden sólo decía `express_status = 'failed'` y el panel mostraba
-- "Uber no tomó la entrega" sin explicar nada. El motivo real quedaba en
-- `audit_logs`, donde nadie que atiende la tienda va a mirar: la primera vez
-- que pasó en producción —Uber respondiendo `authorization_hold`, o sea que no
-- pudo retener el cobro de la tarifa en la cuenta de la tienda— costó una
-- investigación entera para leer una línea que ya estaba guardada.
--
-- Nullable y sin valor por defecto: las órdenes que no son flash, y las que
-- salieron bien, no lo usan.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS express_error text;

COMMENT ON COLUMN public.orders.express_error IS
  'Motivo del último fallo al crear la entrega en Uber. Se limpia al despachar bien.';
