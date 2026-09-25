-- Las dos tablas nuevas de la Fase 1 (supplier_cost_history, category_margins)
-- quedaron sin RLS: un descuido de esa migración. Todas las demás tablas del
-- proyecto la tienen, con el mismo patrón: RLS activa + una política que da
-- acceso total a `authenticated`, igual que product_suppliers y supplier_orders.

ALTER TABLE public.supplier_cost_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_margins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden gestionar el historial de costos"
    ON public.supplier_cost_history
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden gestionar margenes por categoria"
    ON public.category_margins
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
