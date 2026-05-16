-- Fase 1: branch_id (NULLABLE) en tablas operativas + backfill + índices
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id);
ALTER TABLE public.cash_shifts ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id);
ALTER TABLE public.cash_movements ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id);
ALTER TABLE public.inventory_movements ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id);
CREATE INDEX IF NOT EXISTS idx_sales_branch_id ON public.sales(branch_id);
CREATE INDEX IF NOT EXISTS idx_cash_shifts_branch_status ON public.cash_shifts(branch_id, status);
CREATE INDEX IF NOT EXISTS idx_cash_movements_branch ON public.cash_movements(branch_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_branch ON public.inventory_movements(branch_id);
DO $$ DECLARE v uuid; BEGIN
  SELECT id INTO v FROM public.branches WHERE is_default = true LIMIT 1;
  UPDATE public.sales SET branch_id = v WHERE branch_id IS NULL;
  UPDATE public.cash_shifts SET branch_id = v WHERE branch_id IS NULL;
  UPDATE public.cash_movements SET branch_id = v WHERE branch_id IS NULL;
END $$;
