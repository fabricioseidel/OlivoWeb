-- Fase 1: RLS en inventory_movements + apply_sale con soporte multi-sucursal
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inventory_movements_select_authenticated" ON public.inventory_movements FOR SELECT TO authenticated USING (true);
CREATE POLICY "inventory_movements_all_service" ON public.inventory_movements FOR ALL TO service_role USING (true) WITH CHECK (true);
-- apply_sale actualizado (ver migration completa en supabase/09_...)
