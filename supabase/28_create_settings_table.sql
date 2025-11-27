-- =============================================================================
-- SCRIPT 28: CREAR TABLA SETTINGS COMPLETA
-- =============================================================================
-- Fecha: 2025-11-20
-- Propósito: Crear tabla de configuración con todas las opciones de la tienda
-- =============================================================================

-- Crear tabla settings si no existe
CREATE TABLE IF NOT EXISTS public.settings (
  id boolean PRIMARY KEY DEFAULT true,
  
  -- Información general
  store_name VARCHAR(255),
  store_email VARCHAR(255),
  store_phone VARCHAR(20),
  store_address TEXT,
  store_city VARCHAR(100),
  store_country VARCHAR(100),
  store_postal_code VARCHAR(20),
  
  -- Configuración regional
  currency VARCHAR(3) DEFAULT 'CLP',
  language VARCHAR(5) DEFAULT 'es',
  timezone VARCHAR(50) DEFAULT 'America/Santiago',
  
  -- Apariencia
  primary_color VARCHAR(7),
  secondary_color VARCHAR(7),
  accent_color VARCHAR(7),
  logo_url TEXT,
  favicon_url TEXT,
  banner_url TEXT,
  footer_background_color VARCHAR(7),
  footer_text_color VARCHAR(7),
  enable_dark_mode BOOLEAN DEFAULT false,
  
  -- Envíos
  enable_shipping BOOLEAN DEFAULT true,
  free_shipping_enabled BOOLEAN DEFAULT false,
  free_shipping_minimum DECIMAL(10, 2),
  local_delivery_enabled BOOLEAN DEFAULT true,
  local_delivery_fee DECIMAL(10, 2),
  local_delivery_time_days INTEGER DEFAULT 3,
  international_shipping_enabled BOOLEAN DEFAULT false,
  international_shipping_fee DECIMAL(10, 2),
  
  -- Métodos de pago
  payment_methods JSONB DEFAULT '{
    "credit_card": true,
    "debit_card": true,
    "paypal": false,
    "bank_transfer": true,
    "mercado_pago": false,
    "crypto": false
  }'::jsonb,
  payment_test_mode BOOLEAN DEFAULT true,
  
  -- Configuración de emails
  email_from_address VARCHAR(255),
  email_from_name VARCHAR(255),
  order_confirmation_enabled BOOLEAN DEFAULT true,
  shipping_confirmation_enabled BOOLEAN DEFAULT true,
  order_cancellation_enabled BOOLEAN DEFAULT true,
  customer_signup_welcome_enabled BOOLEAN DEFAULT true,
  marketing_emails_enabled BOOLEAN DEFAULT false,
  
  -- Redes sociales
  social_media JSONB DEFAULT '{
    "facebook": null,
    "instagram": null,
    "twitter": null,
    "tiktok": null,
    "youtube": null,
    "linkedin": null,
    "whatsapp": null
  }'::jsonb,
  
  -- SEO
  seo_title VARCHAR(60),
  seo_description VARCHAR(160),
  seo_keywords VARCHAR(255),
  og_image_url TEXT,
  og_image_width INTEGER DEFAULT 1200,
  og_image_height INTEGER DEFAULT 630,
  
  -- Política y configuración
  terms_url TEXT,
  privacy_url TEXT,
  return_policy_url TEXT,
  faq_url TEXT,
  maintenance_mode BOOLEAN DEFAULT false,
  maintenance_message TEXT,
  
  -- Timestamp
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índice en la tabla settings para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_settings_id ON public.settings(id);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION public.update_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_settings_timestamp ON public.settings;

CREATE TRIGGER trigger_settings_timestamp
BEFORE UPDATE ON public.settings
FOR EACH ROW
EXECUTE FUNCTION public.update_settings_timestamp();

-- Crear configuración por defecto
INSERT INTO public.settings (
  id,
  store_name,
  store_email,
  store_phone,
  store_address,
  store_city,
  store_country,
  currency,
  language,
  timezone,
  primary_color,
  secondary_color,
  accent_color,
  logo_url,
  email_from_name,
  email_from_address,
  seo_title,
  seo_description,
  seo_keywords
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

-- Verificar que la tabla fue creada
SELECT * FROM public.settings WHERE id = true;

-- =============================================================================
-- COLUMNAS AGREGADAS:
-- =============================================================================
-- General: store_name, store_email, store_phone, store_address, currency, language, timezone
-- Apariencia: primary_color, secondary_color, accent_color, footer colors, dark mode
-- Envíos: todos los tipos (local, internacional, gratis)
-- Pagos: métodos y modo prueba
-- Emails: configuración de notificaciones
-- Redes Sociales: enlaces a todas las plataformas
-- SEO: meta tags, OG images
-- Política: términos, privacidad, FAQs
-- Mantenimiento: modo mantenimiento con mensaje
-- =============================================================================
