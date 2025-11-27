-- =============================================================================
-- SCRIPT 29: ALTER TABLE settings - agregar columnas faltantes (IF NOT EXISTS)
-- =============================================================================
-- Fecha: 2025-11-20
-- Propósito: Añadir columnas a la tabla `settings` que están referenciadas
-- por la nueva UI/API pero pueden no existir en instalaciones previas.
-- Ejecuta este script en el SQL Editor de Supabase (recomendado) o con psql.
-- =============================================================================

ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS store_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS store_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS store_phone VARCHAR(20),
  ADD COLUMN IF NOT EXISTS store_address TEXT,
  ADD COLUMN IF NOT EXISTS store_city VARCHAR(100),
  ADD COLUMN IF NOT EXISTS store_country VARCHAR(100),
  ADD COLUMN IF NOT EXISTS store_postal_code VARCHAR(20),
  ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'CLP',
  ADD COLUMN IF NOT EXISTS language VARCHAR(5) DEFAULT 'es',
  ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'America/Santiago',
  ADD COLUMN IF NOT EXISTS primary_color VARCHAR(7),
  ADD COLUMN IF NOT EXISTS secondary_color VARCHAR(7),
  ADD COLUMN IF NOT EXISTS accent_color VARCHAR(7),
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS favicon_url TEXT,
  ADD COLUMN IF NOT EXISTS banner_url TEXT,
  ADD COLUMN IF NOT EXISTS footer_background_color VARCHAR(7),
  ADD COLUMN IF NOT EXISTS footer_text_color VARCHAR(7),
  ADD COLUMN IF NOT EXISTS enable_dark_mode BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS enable_shipping BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS free_shipping_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS free_shipping_minimum DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS local_delivery_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS local_delivery_fee DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS local_delivery_time_days INTEGER DEFAULT 3,
  ADD COLUMN IF NOT EXISTS international_shipping_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS international_shipping_fee DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS payment_methods JSONB,
  ADD COLUMN IF NOT EXISTS payment_test_mode BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_from_address VARCHAR(255),
  ADD COLUMN IF NOT EXISTS email_from_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS order_confirmation_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS shipping_confirmation_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS order_cancellation_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS customer_signup_welcome_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS marketing_emails_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS social_media JSONB,
  ADD COLUMN IF NOT EXISTS seo_title VARCHAR(60),
  ADD COLUMN IF NOT EXISTS seo_description VARCHAR(160),
  ADD COLUMN IF NOT EXISTS seo_keywords VARCHAR(255),
  ADD COLUMN IF NOT EXISTS og_image_url TEXT,
  ADD COLUMN IF NOT EXISTS og_image_width INTEGER DEFAULT 1200,
  ADD COLUMN IF NOT EXISTS og_image_height INTEGER DEFAULT 630,
  ADD COLUMN IF NOT EXISTS terms_url TEXT,
  ADD COLUMN IF NOT EXISTS privacy_url TEXT,
  ADD COLUMN IF NOT EXISTS return_policy_url TEXT,
  ADD COLUMN IF NOT EXISTS faq_url TEXT,
  ADD COLUMN IF NOT EXISTS maintenance_mode BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS maintenance_message TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Establecer valores por defecto para JSONB columnas si están vacías
UPDATE public.settings
SET payment_methods = COALESCE(payment_methods, '{"credit_card": true, "debit_card": true, "paypal": false, "bank_transfer": true, "mercado_pago": false, "crypto": false}'::jsonb),
    social_media = COALESCE(social_media, '{"facebook": null, "instagram": null, "twitter": null, "tiktok": null, "youtube": null, "linkedin": null, "whatsapp": null}'::jsonb)
WHERE id = true;

-- Insertar fila por defecto si no existe (solo columnas principales)
INSERT INTO public.settings (
  id, store_name, store_email, store_phone, store_address, store_city, store_country,
  currency, language, timezone, primary_color, secondary_color, accent_color, logo_url,
  email_from_name, email_from_address, seo_title, seo_description, seo_keywords
) VALUES (
  true,
  'OLIVOMARKET',
  'contacto@olivomarket.cl',
  '+56 9 1234 5678',
  'Avenida Principal 1234',
  'Santiago',
  'Chile',
  'CLP',
  'es',
  'America/Santiago',
  '#10B981',
  '#059669',
  '#047857',
  '/logo.png',
  'OLIVOMARKET',
  'noreply@olivomarket.cl',
  'OLIVOMARKET - Tienda Online',
  'Compra los mejores productos de olivo y más en nuestra tienda online',
  'olivo, tienda, productos, compras online'
)
ON CONFLICT (id) DO NOTHING;

-- Refrescar cache: en Supabase el dashboard aplica los cambios inmediatamente.
-- Si usas PostgREST/hasura externamente, reinicia el servicio para refrescar el esquema.

-- =============================================================================
-- Uso: copia y pega este script en el SQL editor del proyecto Supabase y ejecútalo.
-- Luego reinicia tu servidor de desarrollo Next.js para que la caché de PostgREST se actualice.
-- =============================================================================
