-- Oferta con fecha de término (products.offer_ends_at).
--
-- Hoy una oferta dura hasta que alguien se acuerda de quitarla: si nadie lo
-- hace, se sigue cobrando el precio rebajado días o semanas después. Con esta
-- columna la oferta vence sola.
--
-- Regla (la misma en el POS, en OlivoWeb y en la tienda):
--   precio vigente = offer_price  si offer_price > 0
--                                 y (offer_ends_at IS NULL o offer_ends_at > now())
--                    sale_price   en cualquier otro caso.
-- NULL = oferta sin fecha de término (lo que hay hoy: nada cambia para las
-- ofertas existentes).
--
-- El POS guarda el FIN del día elegido en hora de Chile (23:59:59
-- America/Santiago): "Oferta hasta el 15-10" vale todo el 15.
--
-- Columna nullable y sin default: aplicarla no reescribe la tabla ni cambia
-- ningún precio. La lectura pública (anon/authenticated) usa permisos por
-- columna desde 20260929000100, así que se agrega explícitamente para que la
-- tienda pueda decidir si la oferta sigue vigente.
--
-- Idempotente.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS offer_ends_at timestamptz NULL;

COMMENT ON COLUMN public.products.offer_ends_at IS
  'Fin de la oferta (offer_price). NULL = sin fecha de término. La oferta se cobra sólo mientras offer_ends_at sea NULL o futuro.';

GRANT SELECT (offer_ends_at) ON public.products TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
