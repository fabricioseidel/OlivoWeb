-- Segundo mínimo de envío gratis: el del envío flash (Uber Direct).
--
-- Hasta ahora `free_shipping_minimum` era un solo número, pero el mismo regalo
-- cuesta plata muy distinta según quién reparta: el despacho propio cuesta
-- bencina y uno de Uber cuesta lo que Uber cobre ese día. Con un único mínimo
-- había que elegir entre regalar de más en el flash o de menos en el agendado.
--
-- Los valores acordados con el dueño el 2026-08-28, a partir de las
-- cotizaciones reales de Uber en Ñuñoa y Macul ($2.953 a $4.726) y del margen
-- de catálogo (27,5%): $30.000 el agendado, $40.000 el flash.
--
-- Idempotente, como todas las de este repo.

ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS free_shipping_minimum_flash integer;

COMMENT ON COLUMN public.settings.free_shipping_minimum_flash IS
  'Monto mínimo de compra para envío flash (Uber) gratis, en CLP. NULL usa el valor de fábrica del código (MINIMO_FLASH_CLP_DEFAULT). Es más alto que free_shipping_minimum porque el envío lo cobra Uber, no cuesta sólo bencina.';

-- Se siembra sólo si está vacío: si alguien ya lo configuró desde el panel, su
-- valor manda por sobre el de esta migración.
UPDATE public.settings
   SET free_shipping_minimum_flash = 40000
 WHERE free_shipping_minimum_flash IS NULL;
