/* Migration: Add Dynamic Shipping Fields to Settings */
/* Date: 2026-02-26 */

DO $$
BEGIN
    -- Origin coordinates for shipping calculations
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'shipping_origin_lat') THEN
        ALTER TABLE public.settings ADD COLUMN shipping_origin_lat DECIMAL(10, 8);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'shipping_origin_lng') THEN
        ALTER TABLE public.settings ADD COLUMN shipping_origin_lng DECIMAL(11, 8);
    END IF;

    -- Shipping rates
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'shipping_base_fee') THEN
        ALTER TABLE public.settings ADD COLUMN shipping_base_fee DECIMAL(10, 2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'shipping_price_per_km') THEN
        ALTER TABLE public.settings ADD COLUMN shipping_price_per_km DECIMAL(10, 2) DEFAULT 0;
    END IF;
    
    -- Toggle for dynamic calculation
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'enable_dynamic_shipping') THEN
        ALTER TABLE public.settings ADD COLUMN enable_dynamic_shipping BOOLEAN DEFAULT FALSE;
    END IF;
END $$;
