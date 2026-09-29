-- =====================================================================
-- 20260929000000_costo_cargado.sql
--
-- Primer paso para ocultar el costo de compra a la clave pública (ver
-- 20260929000100_cerrar_acceso_directo_clave_publica.sql).
--
-- La tienda pública sólo publica productos con costo cargado, y para saberlo
-- leía `purchase_price`: el costo mismo. Esta columna generada responde lo
-- único que la tienda necesita —¿tiene costo?— sin mostrarlo.
--
-- Va separada porque el código nuevo la lee y tiene que existir ANTES de
-- publicarlo, mientras que quitar los permisos tiene que ir DESPUÉS: al
-- revés, la versión anterior del sitio (que pide purchase_price con la clave
-- pública) dejaría de mostrar productos.
--
-- Aditiva e idempotente.
-- =====================================================================

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS costo_cargado boolean
  GENERATED ALWAYS AS (COALESCE(purchase_price, 0) > 0) STORED;

COMMENT ON COLUMN public.products.costo_cargado IS
  'purchase_price > 0. La tienda pública lo usa para decidir qué se publica sin poder leer el costo.';

