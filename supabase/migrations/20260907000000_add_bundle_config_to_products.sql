-- =====================================================================
-- 20260907000000_add_bundle_config_to_products.sql
--
-- Agrega soporte para productos compuestos y packs configurables.
-- Permite almacenar la estructura de ítems fijos y grupos de opciones
-- (sabores, salsas, etc.) seleccionables por el cliente.
-- =====================================================================

ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS bundle_config JSONB DEFAULT NULL;

COMMENT ON COLUMN public.products.bundle_config IS 'Configuración de producto compuesto/pack: ítems fijos y grupos de selección personalizables.';
