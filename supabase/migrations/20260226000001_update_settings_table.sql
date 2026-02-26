/* Migration: Update Settings Table Columns */
/* Date: 2026-02-26 */

-- Ensure settings table exists
CREATE TABLE IF NOT EXISTS public.settings (
    id BOOLEAN PRIMARY KEY DEFAULT TRUE,
    CONSTRAINT single_row CHECK (id),
    store_name TEXT,
    store_email TEXT,
    store_phone TEXT,
    store_address TEXT,
    store_city TEXT,
    store_country TEXT,
    store_postal_code TEXT,
    currency TEXT DEFAULT 'CLP',
    language TEXT DEFAULT 'es',
    timezone TEXT DEFAULT 'America/Santiago',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns safely
DO $$
BEGIN
    -- Appearance
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'primary_color') THEN
        ALTER TABLE public.settings ADD COLUMN primary_color TEXT DEFAULT '#10B981';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'secondary_color') THEN
        ALTER TABLE public.settings ADD COLUMN secondary_color TEXT DEFAULT '#059669';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'accent_color') THEN
        ALTER TABLE public.settings ADD COLUMN accent_color TEXT DEFAULT '#047857';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'logo_url') THEN
        ALTER TABLE public.settings ADD COLUMN logo_url TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'favicon_url') THEN
        ALTER TABLE public.settings ADD COLUMN favicon_url TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'banner_url') THEN
        ALTER TABLE public.settings ADD COLUMN banner_url TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'footer_background_color') THEN
        ALTER TABLE public.settings ADD COLUMN footer_background_color TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'footer_text_color') THEN
        ALTER TABLE public.settings ADD COLUMN footer_text_color TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'enable_dark_mode') THEN
        ALTER TABLE public.settings ADD COLUMN enable_dark_mode BOOLEAN DEFAULT FALSE;
    END IF;

    -- Shipping
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'enable_shipping') THEN
        ALTER TABLE public.settings ADD COLUMN enable_shipping BOOLEAN DEFAULT TRUE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'free_shipping_enabled') THEN
        ALTER TABLE public.settings ADD COLUMN free_shipping_enabled BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'free_shipping_minimum') THEN
        ALTER TABLE public.settings ADD COLUMN free_shipping_minimum DECIMAL(10, 2);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'local_delivery_enabled') THEN
        ALTER TABLE public.settings ADD COLUMN local_delivery_enabled BOOLEAN DEFAULT TRUE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'local_delivery_fee') THEN
        ALTER TABLE public.settings ADD COLUMN local_delivery_fee DECIMAL(10, 2);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'local_delivery_time_days') THEN
        ALTER TABLE public.settings ADD COLUMN local_delivery_time_days INTEGER DEFAULT 3;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'international_shipping_enabled') THEN
        ALTER TABLE public.settings ADD COLUMN international_shipping_enabled BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'international_shipping_fee') THEN
        ALTER TABLE public.settings ADD COLUMN international_shipping_fee DECIMAL(10, 2);
    END IF;

    -- Payments
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'payment_methods') THEN
        ALTER TABLE public.settings ADD COLUMN payment_methods JSONB DEFAULT '{}'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'payment_test_mode') THEN
        ALTER TABLE public.settings ADD COLUMN payment_test_mode BOOLEAN DEFAULT TRUE;
    END IF;

    -- Emails
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'email_from_address') THEN
        ALTER TABLE public.settings ADD COLUMN email_from_address TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'email_from_name') THEN
        ALTER TABLE public.settings ADD COLUMN email_from_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'order_confirmation_enabled') THEN
        ALTER TABLE public.settings ADD COLUMN order_confirmation_enabled BOOLEAN DEFAULT TRUE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'shipping_confirmation_enabled') THEN
        ALTER TABLE public.settings ADD COLUMN shipping_confirmation_enabled BOOLEAN DEFAULT TRUE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'order_cancellation_enabled') THEN
        ALTER TABLE public.settings ADD COLUMN order_cancellation_enabled BOOLEAN DEFAULT TRUE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'customer_signup_welcome_enabled') THEN
        ALTER TABLE public.settings ADD COLUMN customer_signup_welcome_enabled BOOLEAN DEFAULT TRUE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'marketing_emails_enabled') THEN
        ALTER TABLE public.settings ADD COLUMN marketing_emails_enabled BOOLEAN DEFAULT FALSE;
    END IF;

    -- Social Media
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'social_media') THEN
        ALTER TABLE public.settings ADD COLUMN social_media JSONB DEFAULT '{}'::jsonb;
    END IF;

    -- SEO
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'seo_title') THEN
        ALTER TABLE public.settings ADD COLUMN seo_title TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'seo_description') THEN
        ALTER TABLE public.settings ADD COLUMN seo_description TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'seo_keywords') THEN
        ALTER TABLE public.settings ADD COLUMN seo_keywords TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'og_image_url') THEN
        ALTER TABLE public.settings ADD COLUMN og_image_url TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'og_image_width') THEN
        ALTER TABLE public.settings ADD COLUMN og_image_width INTEGER DEFAULT 1200;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'og_image_height') THEN
        ALTER TABLE public.settings ADD COLUMN og_image_height INTEGER DEFAULT 630;
    END IF;

    -- Policies
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'terms_url') THEN
        ALTER TABLE public.settings ADD COLUMN terms_url TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'privacy_url') THEN
        ALTER TABLE public.settings ADD COLUMN privacy_url TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'return_policy_url') THEN
        ALTER TABLE public.settings ADD COLUMN return_policy_url TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'faq_url') THEN
        ALTER TABLE public.settings ADD COLUMN faq_url TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'maintenance_mode') THEN
        ALTER TABLE public.settings ADD COLUMN maintenance_mode BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'maintenance_message') THEN
        ALTER TABLE public.settings ADD COLUMN maintenance_message TEXT;
    END IF;
END $$;
