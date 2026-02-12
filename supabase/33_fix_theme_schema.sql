-- =============================================================================
-- SCRIPT 33: FIX THEME COLUMNS - Asegurar columnas de tema en tabla settings
-- =============================================================================
-- Este script asegura que existan las columnas necesarias para los colores personalizados.
-- Ejecútalo en el SQL Editor de Supabase.

ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS primary_color VARCHAR(7),
  ADD COLUMN IF NOT EXISTS secondary_color VARCHAR(7),
  ADD COLUMN IF NOT EXISTS accent_color VARCHAR(7),
  ADD COLUMN IF NOT EXISTS footer_background_color VARCHAR(7),
  ADD COLUMN IF NOT EXISTS footer_text_color VARCHAR(7),
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS favicon_url TEXT,
  ADD COLUMN IF NOT EXISTS banner_url TEXT;

-- Actualizar la fila de configuración para asegurarse de que tenga valores válidos por defecto
-- si es que están nulos. Esto evita que la interfaz se vea "rota" o transparente.
UPDATE public.settings
SET 
  primary_color = COALESCE(primary_color, '#F575A2'), -- Rosado por defecto si está nulo
  secondary_color = COALESCE(secondary_color, '#244d61'),
  accent_color = COALESCE(accent_color, '#14130b'),
  footer_background_color = COALESCE(footer_background_color, '#ffdbs7'),
  footer_text_color = COALESCE(footer_text_color, '#000000')
WHERE id = true;

-- Forzar refresco de caché de esquema (opcional, pero útil)
NOTIFY pgrst, 'reload schema';
