-- =============================================================================
-- SCRIPT 8: CREAR TABLA sale_items PARA DETALLES DE VENTAS
-- =============================================================================
-- Fecha: 2025-10-28
-- Propósito: Almacenar items individuales de cada venta
-- IMPORTANTE: Reemplaza el campo items_json que no existe
-- =============================================================================

-- =============================================================================
-- PASO 1: CREAR TABLA sale_items
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.sale_items (
  id BIGSERIAL PRIMARY KEY,
  sale_id BIGINT NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  product_barcode TEXT NOT NULL,
  product_name TEXT NOT NULL,
  quantity NUMERIC(10,3) NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
  subtotal NUMERIC(10,2) NOT NULL CHECK (subtotal >= 0),
  discount NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- PASO 2: CREAR ÍNDICES
-- =============================================================================

-- Índice para buscar items por venta
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id 
  ON public.sale_items(sale_id);

-- Índice para buscar ventas por producto
CREATE INDEX IF NOT EXISTS idx_sale_items_barcode 
  ON public.sale_items(product_barcode);

-- Índice compuesto para queries comunes
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_product 
  ON public.sale_items(sale_id, product_barcode);

-- =============================================================================
-- PASO 3: HABILITAR RLS
-- =============================================================================

ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- PASO 4: CREAR POLÍTICAS RLS
-- =============================================================================

-- Permitir lectura a usuarios autenticados
CREATE POLICY sale_items_select_authenticated ON public.sale_items
  FOR SELECT
  USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Solo service_role puede insertar
CREATE POLICY sale_items_insert_service ON public.sale_items
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Solo service_role puede actualizar
CREATE POLICY sale_items_update_service ON public.sale_items
  FOR UPDATE
  USING (auth.role() = 'service_role');

-- Solo service_role puede eliminar
CREATE POLICY sale_items_delete_service ON public.sale_items
  FOR DELETE
  USING (auth.role() = 'service_role');

-- =============================================================================
-- PASO 5: AGREGAR FOREIGN KEY A PRODUCTOS (OPCIONAL)
-- =============================================================================

-- Nota: Solo si quieres forzar que el barcode exista en products
-- Puede causar problemas si se eliminan productos que tienen ventas

-- ALTER TABLE public.sale_items
-- ADD CONSTRAINT fk_sale_items_product
-- FOREIGN KEY (product_barcode) 
-- REFERENCES public.products(barcode)
-- ON DELETE RESTRICT;

-- =============================================================================
-- PASO 6: CREAR VISTA PARA REPORTES
-- =============================================================================

CREATE OR REPLACE VIEW public.sales_with_items AS
SELECT 
  s.id as sale_id,
  s.ts as sale_date,
  s.total as sale_total,
  s.payment_method,
  s.device_id,
  s.client_sale_id,
  si.id as item_id,
  si.product_barcode,
  si.product_name,
  si.quantity,
  si.unit_price,
  si.subtotal,
  si.discount as item_discount
FROM public.sales s
LEFT JOIN public.sale_items si ON s.id = si.sale_id
ORDER BY s.ts DESC, si.id;

-- =============================================================================
-- PASO 7: CREAR FUNCIÓN PARA CALCULAR TOTALES
-- =============================================================================

CREATE OR REPLACE FUNCTION public.calculate_sale_total(p_sale_id BIGINT)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_total NUMERIC;
BEGIN
  SELECT COALESCE(SUM(subtotal), 0)
  INTO v_total
  FROM public.sale_items
  WHERE sale_id = p_sale_id;
  
  RETURN v_total;
END;
$$;

-- =============================================================================
-- PASO 8: AGREGAR COMENTARIOS
-- =============================================================================

COMMENT ON TABLE public.sale_items IS 'Detalles individuales de cada venta (items)';
COMMENT ON COLUMN public.sale_items.sale_id IS 'ID de la venta padre';
COMMENT ON COLUMN public.sale_items.product_barcode IS 'Código de barras del producto';
COMMENT ON COLUMN public.sale_items.product_name IS 'Nombre del producto al momento de la venta';
COMMENT ON COLUMN public.sale_items.quantity IS 'Cantidad vendida (soporta decimales para productos por peso)';
COMMENT ON COLUMN public.sale_items.unit_price IS 'Precio unitario al momento de la venta';
COMMENT ON COLUMN public.sale_items.subtotal IS 'Total del item (quantity * unit_price - discount)';

-- =============================================================================
-- VERIFICACIÓN
-- =============================================================================

-- Verificar estructura
-- SELECT 
--   column_name, 
--   data_type, 
--   is_nullable
-- FROM information_schema.columns
-- WHERE table_schema = 'public' 
--   AND table_name = 'sale_items'
-- ORDER BY ordinal_position;

-- Verificar índices
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE schemaname = 'public' 
--   AND tablename = 'sale_items';

-- Verificar RLS
-- SELECT tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public' AND tablename = 'sale_items';

