-- =============================================================================
-- SCRIPT 31: SISTEMA DE MARKETING & EMAIL
-- =============================================================================
-- Fecha: 2026-03-19
-- Propósito: Crear infraestructura para emails, cupones, puntos, campañas
-- =============================================================================

-- =============================================================================
-- PASO 1: AMPLIAR TABLA customers
-- =============================================================================

ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN DEFAULT false;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS loyalty_points INTEGER DEFAULT 0;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS total_spent NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS order_count INTEGER DEFAULT 0;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS last_purchase_at TIMESTAMPTZ;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS birthday DATE;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- =============================================================================
-- PASO 2: NEWSLETTER SUBSCRIBERS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id BIGSERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  is_active BOOLEAN DEFAULT true,
  source TEXT DEFAULT 'website',
  subscribed_at TIMESTAMPTZ DEFAULT now(),
  unsubscribed_at TIMESTAMPTZ
);

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY newsletter_select ON public.newsletter_subscribers
  FOR SELECT USING (auth.role() = 'service_role');
CREATE POLICY newsletter_insert ON public.newsletter_subscribers
  FOR INSERT WITH CHECK (true);
CREATE POLICY newsletter_update ON public.newsletter_subscribers
  FOR UPDATE USING (auth.role() = 'service_role');
CREATE POLICY newsletter_delete ON public.newsletter_subscribers
  FOR DELETE USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_newsletter_email ON public.newsletter_subscribers(email);
CREATE INDEX IF NOT EXISTS idx_newsletter_active ON public.newsletter_subscribers(is_active);

-- =============================================================================
-- PASO 3: EMAIL TEMPLATES
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.email_templates (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_body TEXT NOT NULL,
  variables TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY email_templates_select ON public.email_templates
  FOR SELECT USING (auth.role() IN ('authenticated', 'service_role'));
CREATE POLICY email_templates_insert ON public.email_templates
  FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY email_templates_update ON public.email_templates
  FOR UPDATE USING (auth.role() = 'service_role');
CREATE POLICY email_templates_delete ON public.email_templates
  FOR DELETE USING (auth.role() = 'service_role');

-- =============================================================================
-- PASO 4: EMAIL LOG
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.email_log (
  id BIGSERIAL PRIMARY KEY,
  to_email TEXT NOT NULL,
  to_name TEXT,
  from_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  template_slug TEXT,
  status TEXT DEFAULT 'sent',
  resend_id TEXT,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  sent_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.email_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY email_log_select ON public.email_log
  FOR SELECT USING (auth.role() IN ('authenticated', 'service_role'));
CREATE POLICY email_log_insert ON public.email_log
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_email_log_to ON public.email_log(to_email);
CREATE INDEX IF NOT EXISTS idx_email_log_status ON public.email_log(status);
CREATE INDEX IF NOT EXISTS idx_email_log_template ON public.email_log(template_slug);
CREATE INDEX IF NOT EXISTS idx_email_log_sent_at ON public.email_log(sent_at DESC);

-- =============================================================================
-- PASO 5: CUPONES
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.coupons (
  id BIGSERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount', 'free_shipping')),
  discount_value NUMERIC(10,2) NOT NULL,
  min_purchase NUMERIC(10,2) DEFAULT 0,
  max_discount NUMERIC(10,2),
  max_uses INTEGER,
  uses_count INTEGER DEFAULT 0,
  max_uses_per_customer INTEGER DEFAULT 1,
  valid_from TIMESTAMPTZ DEFAULT now(),
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  applies_to TEXT DEFAULT 'all',
  applies_to_ids TEXT[] DEFAULT '{}',
  auto_apply BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY coupons_select ON public.coupons
  FOR SELECT USING (true);
CREATE POLICY coupons_insert ON public.coupons
  FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY coupons_update ON public.coupons
  FOR UPDATE USING (auth.role() = 'service_role');
CREATE POLICY coupons_delete ON public.coupons
  FOR DELETE USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON public.coupons(is_active);

-- =============================================================================
-- PASO 6: COUPON USAGE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.coupon_usage (
  id BIGSERIAL PRIMARY KEY,
  coupon_id BIGINT NOT NULL REFERENCES public.coupons(id),
  customer_id TEXT,
  customer_email TEXT,
  order_id TEXT,
  sale_id BIGINT,
  discount_applied NUMERIC(10,2) NOT NULL,
  used_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.coupon_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY coupon_usage_select ON public.coupon_usage
  FOR SELECT USING (auth.role() IN ('authenticated', 'service_role'));
CREATE POLICY coupon_usage_insert ON public.coupon_usage
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_coupon_usage_coupon ON public.coupon_usage(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_customer ON public.coupon_usage(customer_email);

-- =============================================================================
-- PASO 7: LOYALTY CONFIG
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.loyalty_config (
  id BOOLEAN PRIMARY KEY DEFAULT true,
  points_per_currency NUMERIC(10,4) DEFAULT 1,
  currency_threshold NUMERIC(10,2) DEFAULT 1000,
  redemption_value NUMERIC(10,2) DEFAULT 100,
  min_points_redeem INTEGER DEFAULT 50,
  welcome_bonus INTEGER DEFAULT 50,
  birthday_bonus INTEGER DEFAULT 100,
  referral_bonus INTEGER DEFAULT 200,
  is_active BOOLEAN DEFAULT true,
  tiers JSONB DEFAULT '[
    {"name": "Bronce", "min_points": 0, "multiplier": 1.0, "color": "#CD7F32"},
    {"name": "Plata", "min_points": 500, "multiplier": 1.5, "color": "#C0C0C0"},
    {"name": "Oro", "min_points": 2000, "multiplier": 2.0, "color": "#FFD700"},
    {"name": "Platino", "min_points": 5000, "multiplier": 3.0, "color": "#E5E4E2"}
  ]'
);

ALTER TABLE public.loyalty_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY loyalty_config_select ON public.loyalty_config
  FOR SELECT USING (true);
CREATE POLICY loyalty_config_update ON public.loyalty_config
  FOR UPDATE USING (auth.role() = 'service_role');
CREATE POLICY loyalty_config_insert ON public.loyalty_config
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Insert default config
INSERT INTO public.loyalty_config (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- PASO 8: LOYALTY TRANSACTIONS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.loyalty_transactions (
  id BIGSERIAL PRIMARY KEY,
  customer_id TEXT NOT NULL,
  customer_email TEXT,
  type TEXT NOT NULL CHECK (type IN ('earn', 'redeem', 'bonus', 'expire', 'adjust')),
  points INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  description TEXT NOT NULL,
  reference_type TEXT,
  reference_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY loyalty_tx_select ON public.loyalty_transactions
  FOR SELECT USING (auth.role() IN ('authenticated', 'service_role'));
CREATE POLICY loyalty_tx_insert ON public.loyalty_transactions
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_loyalty_tx_customer ON public.loyalty_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_tx_email ON public.loyalty_transactions(customer_email);
CREATE INDEX IF NOT EXISTS idx_loyalty_tx_type ON public.loyalty_transactions(type);
CREATE INDEX IF NOT EXISTS idx_loyalty_tx_created ON public.loyalty_transactions(created_at DESC);

-- =============================================================================
-- PASO 9: CAMPAIGNS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.campaigns (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  template_slug TEXT,
  html_content TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'cancelled')),
  audience TEXT DEFAULT 'all',
  audience_filter JSONB DEFAULT '{}',
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  stats JSONB DEFAULT '{"total": 0, "sent": 0, "opened": 0, "clicked": 0, "failed": 0}',
  coupon_id BIGINT REFERENCES public.coupons(id),
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY campaigns_select ON public.campaigns
  FOR SELECT USING (auth.role() IN ('authenticated', 'service_role'));
CREATE POLICY campaigns_insert ON public.campaigns
  FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY campaigns_update ON public.campaigns
  FOR UPDATE USING (auth.role() = 'service_role');
CREATE POLICY campaigns_delete ON public.campaigns
  FOR DELETE USING (auth.role() = 'service_role');

-- =============================================================================
-- PASO 10: CAMPAIGN RECIPIENTS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.campaign_recipients (
  id BIGSERIAL PRIMARY KEY,
  campaign_id BIGINT NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'opened', 'clicked', 'unsubscribed')),
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  error_message TEXT
);

ALTER TABLE public.campaign_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY campaign_recipients_select ON public.campaign_recipients
  FOR SELECT USING (auth.role() IN ('authenticated', 'service_role'));
CREATE POLICY campaign_recipients_insert ON public.campaign_recipients
  FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY campaign_recipients_update ON public.campaign_recipients
  FOR UPDATE USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_campaign_recipients_campaign ON public.campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_status ON public.campaign_recipients(status);

-- =============================================================================
-- VERIFICACIÓN
-- =============================================================================

-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- AND table_name IN ('newsletter_subscribers', 'email_templates', 'email_log', 
--                    'coupons', 'coupon_usage', 'loyalty_config', 'loyalty_transactions',
--                    'campaigns', 'campaign_recipients')
-- ORDER BY table_name;

-- =============================================================================
-- FIN DEL SCRIPT 31
-- =============================================================================
