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


-- ---------------------------------------------------------------------
-- Bucket privado para comprobantes de venta y documentos de pedidos a
-- proveedor. Hasta hoy iban al bucket público `uploads`, con nombres
-- predecibles: cualquiera con la URL veía la transferencia de un cliente o la
-- factura de un proveedor. Se sirven por /api/admin/archivos, con sesión.
-- ---------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'comprobantes',
  'comprobantes',
  false,
  10485760,
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO NOTHING;
