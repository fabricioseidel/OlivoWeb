/* Migration: Cash Management (Shifts and Cash Movements) */
/* Date: 2026-03-18 */

-- 1. Create Shift Status Enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'shift_status') THEN
        CREATE TYPE shift_status AS ENUM ('OPEN', 'CLOSED');
    END IF;
END $$;

-- 2. Create cash_shifts table
CREATE TABLE IF NOT EXISTS public.cash_shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID REFERENCES public.sellers(id) ON DELETE SET NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL, -- Web user fallback
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    starting_cash DECIMAL(12, 2) NOT NULL DEFAULT 0,
    expected_cash DECIMAL(12, 2) NOT NULL DEFAULT 0, -- Calculated: starting + cash_sales + cash_in - cash_out
    actual_cash DECIMAL(12, 2), -- Provided at close
    difference DECIMAL(12, 2), -- actual - expected
    status shift_status DEFAULT 'OPEN',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for shifts
CREATE INDEX IF NOT EXISTS idx_cash_shifts_seller_id ON public.cash_shifts(seller_id);
CREATE INDEX IF NOT EXISTS idx_cash_shifts_status ON public.cash_shifts(status);

-- 3. Create cash_movements table (Extra cash in/out)
CREATE TABLE IF NOT EXISTS public.cash_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shift_id UUID REFERENCES public.cash_shifts(id) ON DELETE CASCADE,
    type movement_type NOT NULL, -- IN/OUT (already exists from inventory movements)
    amount DECIMAL(12, 2) NOT NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Update sales table to include shift_id
-- We assume sales.id is UUID if using 2026 migrations
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS shift_id UUID REFERENCES public.cash_shifts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sales_shift_id ON public.sales(shift_id);

-- 5. RLS Policies
ALTER TABLE public.cash_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY cash_shifts_select_auth ON public.cash_shifts
    FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY cash_shifts_all_service ON public.cash_shifts
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY cash_movements_select_auth ON public.cash_movements
    FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY cash_movements_all_service ON public.cash_movements
    FOR ALL USING (auth.role() = 'service_role');

-- 6. Trigger for updated_at
CREATE TRIGGER tr_cash_shifts_updated_at
    BEFORE UPDATE ON public.cash_shifts
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 7. Add comments
COMMENT ON TABLE public.cash_shifts IS 'Arqueos de caja (turnos)';
COMMENT ON TABLE public.cash_movements IS 'Entradas/Salidas manuales de dinero de caja';
