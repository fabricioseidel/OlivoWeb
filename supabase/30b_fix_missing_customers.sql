-- =============================================================================
-- TABLA DE CLIENTES (CORRECCIÓN DE ERROR 42P01)
-- =============================================================================
-- Propósito: Crear la tabla base de clientes que falta en el esquema actual.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  customer_type TEXT DEFAULT 'retail' CHECK (customer_type IN ('retail', 'wholesale', 'other')),
  notes TEXT,
  
  -- Columnas integradas del sistema de marketing
  email_verified BOOLEAN DEFAULT false,
  marketing_consent BOOLEAN DEFAULT false,
  loyalty_points INTEGER DEFAULT 0,
  total_spent NUMERIC(12,2) DEFAULT 0,
  order_count INTEGER DEFAULT 0,
  last_purchase_at TIMESTAMPTZ,
  birthday DATE,
  source TEXT DEFAULT 'manual',
  tags TEXT[] DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para optimización
CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_loyalty ON public.customers(loyalty_points DESC);
CREATE INDEX IF NOT EXISTS idx_customers_consent ON public.customers(marketing_consent) WHERE marketing_consent = true;

-- Habilitar RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Políticas de Seguridad
CREATE POLICY customers_select_admin ON public.customers
  FOR SELECT USING (auth.role() IN ('authenticated', 'service_role'));

CREATE POLICY customers_insert_admin ON public.customers
  FOR INSERT WITH CHECK (auth.role() IN ('authenticated', 'service_role'));

CREATE POLICY customers_update_admin ON public.customers
  FOR UPDATE USING (auth.role() IN ('authenticated', 'service_role'));

CREATE POLICY customers_delete_admin ON public.customers
  FOR DELETE USING (auth.role() = 'service_role');

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_customers_updated_at ON public.customers;
CREATE TRIGGER tr_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Comentarios
COMMENT ON TABLE public.customers IS 'Tabla central de clientes para ventas, marketing y fidelización';
COMMENT ON COLUMN public.customers.loyalty_points IS 'Puntos acumulados en el programa de fidelización';
COMMENT ON COLUMN public.customers.marketing_consent IS 'Indica si el cliente acepta comunicaciones de marketing';
