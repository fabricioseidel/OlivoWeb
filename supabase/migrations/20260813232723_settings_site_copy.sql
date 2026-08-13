-- =============================================================================
-- Textos editables del sitio
-- =============================================================================
-- Propósito: permitir que un administrador corrija cualquier texto visible de
-- la tienda desde el panel, sin tocar código ni desplegar.
--
-- Se guarda como JSONB { "clave": "texto" } en vez de una columna por texto:
-- así agregar un texto nuevo al registro (src/lib/site-copy.ts) no requiere
-- otra migración. Las claves sin override caen al valor por defecto del código.
-- =============================================================================

ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS site_copy JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.settings.site_copy IS
  'Overrides de textos del front, { clave: texto }. Claves definidas en src/lib/site-copy.ts';
