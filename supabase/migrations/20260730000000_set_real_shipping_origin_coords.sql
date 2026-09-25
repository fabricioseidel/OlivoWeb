-- Coordenadas reales del local, provistas por Fabri (30-jul-2026).
-- El valor anterior (-33.486975, -70.6060496) estaba desfasado ~2.3km del
-- local real, lo que hacía que el cálculo de envío a domicilio cobrara
-- distancias incorrectas (detectado en una compra de prueba real).
UPDATE public.settings
SET shipping_origin_lat = -33.472904287482656,
    shipping_origin_lng = -70.59850517606597
WHERE id = true;
