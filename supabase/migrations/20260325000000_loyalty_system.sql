/* Migration: Loyalty System Tables and Fields */
/* Date: 2026-03-25 */

-- 1. Create loyalty_config table
CREATE TABLE IF NOT EXISTS public.loyalty_config (
    id BOOLEAN PRIMARY KEY DEFAULT TRUE,
    points_per_currency INTEGER NOT NULL DEFAULT 1,
    currency_threshold INTEGER NOT NULL DEFAULT 1000,
    redemption_value INTEGER NOT NULL DEFAULT 100,
    min_points_redeem INTEGER NOT NULL DEFAULT 50,
    welcome_bonus INTEGER NOT NULL DEFAULT 50,
    birthday_bonus INTEGER NOT NULL DEFAULT 100,
    referral_bonus INTEGER NOT NULL DEFAULT 200,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    tiers JSONB NOT NULL DEFAULT '[
        {"name": "Bronce", "min_points": 0, "multiplier": 1.0, "color": "#CD7F32"},
        {"name": "Plata", "min_points": 500, "multiplier": 1.5, "color": "#C0C0C0"},
        {"name": "Oro", "min_points": 2000, "multiplier": 2.0, "color": "#FFD700"},
        {"name": "Platino", "min_points": 5000, "multiplier": 3.0, "color": "#E5E4E2"}
    ]',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT singleton_row CHECK (id = TRUE)
);

-- Initialize config if not exists
INSERT INTO public.loyalty_config (id) VALUES (TRUE) ON CONFLICT (id) DO NOTHING;

-- 2. Create loyalty_transactions table
CREATE TABLE IF NOT EXISTS public.loyalty_transactions (
    id BIGSERIAL PRIMARY KEY,
    customer_id TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('earn', 'redeem', 'bonus', 'expire', 'adjust')),
    points INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    description TEXT,
    reference_type TEXT,
    reference_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_customer_email ON public.loyalty_transactions(customer_email);

-- 3. Add loyalty_points to customers table
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'customers' AND COLUMN_NAME = 'loyalty_points') THEN
        ALTER TABLE public.customers ADD COLUMN loyalty_points INTEGER DEFAULT 0;
    END IF;
END $$;
