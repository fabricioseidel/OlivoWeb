-- =====================================================================
-- 20260826000300_require_reviewed_price.sql
--
-- Regla de venta web (Fase 4 de docs/PLAN_PRECIOS.md):
-- sólo se vende por la web lo que tiene costo de proveedor cargado y precio
-- de venta revisado.
--
-- Nace APAGADA, y esa es la decisión importante. Encenderla de entrada sacaría
-- del aire, sin aviso, todos los productos que hoy no cumplen — que al empezar
-- son casi todos, porque `price_reviewed_at` arranca en NULL para el catálogo
-- entero (ver 20260826000000: no se rellenó con una fecha inventada
-- precisamente para no mentir sobre qué se revisó).
--
-- El orden es: la pantalla de precios dice cuántos productos quedarían fuera,
-- se depura esa lista, y recién entonces se enciende el interruptor.
-- =====================================================================

ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS require_reviewed_price boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.settings.require_reviewed_price IS
  'Si está en true, la venta web rechaza productos sin costo de proveedor o sin precio revisado. Apagado por defecto: encenderlo sin depurar el catálogo saca productos del aire sin aviso.';

-- Índice para la consulta que arma el impacto de la regla: "qué productos
-- quedarían fuera". Recorre el catálogo activo filtrando por revisión.
CREATE INDEX IF NOT EXISTS idx_products_sin_revisar
  ON public.products(barcode)
  WHERE price_reviewed_at IS NULL;
