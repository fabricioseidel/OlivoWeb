-- =============================================================================
-- SCRIPT 10: CREAR TABLA sellers Y RELACIONAR CON VENTAS
-- =============================================================================
-- Fecha: 2025-10-28
-- Propósito: Crear tabla para vendedores/usuarios de la app móvil
-- IMPORTANTE: Permite integrar autenticación entre móvil y web
-- =============================================================================

-- =============================================================================
-- PASO 1: CREAR TABLA sellers
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.sellers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  device_id TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_sync TIMESTAMPTZ
);

-- =============================================================================
-- PASO 2: CREAR ÍNDICES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_sellers_name ON public.sellers(name);
CREATE INDEX IF NOT EXISTS idx_sellers_user_id ON public.sellers(user_id);
CREATE INDEX IF NOT EXISTS idx_sellers_device_id ON public.sellers(device_id);
CREATE INDEX IF NOT EXISTS idx_sellers_active ON public.sellers(active) WHERE active = true;

-- =============================================================================
-- PASO 3: AGREGAR COLUMNA seller_id A TABLA sales
-- =============================================================================

ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES public.sellers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sales_seller_id ON public.sales(seller_id);

-- =============================================================================
-- PASO 4: HABILITAR RLS EN sellers
-- =============================================================================

ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- PASO 5: CREAR POLÍTICAS RLS
-- =============================================================================

-- Todos los autenticados pueden ver sellers activos
CREATE POLICY sellers_select_active ON public.sellers
  FOR SELECT
  USING (active = true OR auth.role() = 'service_role');

-- Solo service_role puede insertar sellers
CREATE POLICY sellers_insert_service ON public.sellers
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Solo service_role puede actualizar
CREATE POLICY sellers_update_service ON public.sellers
  FOR UPDATE
  USING (auth.role() = 'service_role');

-- Solo service_role puede eliminar
CREATE POLICY sellers_delete_service ON public.sellers
  FOR DELETE
  USING (auth.role() = 'service_role');

-- =============================================================================
-- PASO 6: CREAR TRIGGER PARA updated_at
-- =============================================================================

CREATE TRIGGER sellers_updated_at
  BEFORE UPDATE ON public.sellers
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- PASO 7: INSERTAR VENDEDORES EXISTENTES (MIGRACIÓN)
-- =============================================================================

-- Migrar los usuarios que actualmente existen en la app móvil
INSERT INTO public.sellers (name, active, created_at)
VALUES 
  ('MARIANA', true, now()),
  ('INGRID', true, now()),
  ('ALFREDO', true, now()),
  ('FABRICIO', true, now()),
  ('MARIA', true, now()),
  ('PRUEBAS', true, now())
ON CONFLICT (name) DO NOTHING;

-- =============================================================================
-- PASO 8: CREAR FUNCIÓN PARA REGISTRAR ACTIVIDAD DE VENDEDOR
-- =============================================================================

CREATE OR REPLACE FUNCTION public.update_seller_activity(
  p_seller_name TEXT,
  p_device_id TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_seller_id UUID;
BEGIN
  -- Buscar o crear el vendedor
  INSERT INTO public.sellers (name, device_id, last_sync)
  VALUES (UPPER(TRIM(p_seller_name)), p_device_id, now())
  ON CONFLICT (name) 
  DO UPDATE SET 
    last_sync = now(),
    device_id = COALESCE(EXCLUDED.device_id, sellers.device_id)
  RETURNING id INTO v_seller_id;
  
  RETURN v_seller_id;
END;
$$;

-- =============================================================================
-- PASO 9: ACTUALIZAR apply_sale PARA INCLUIR seller_id
-- =============================================================================

CREATE OR REPLACE FUNCTION public.apply_sale(
  p_total NUMERIC,
  p_payment_method TEXT DEFAULT 'cash',
  p_cash_received NUMERIC DEFAULT 0,
  p_change_given NUMERIC DEFAULT 0,
  p_discount NUMERIC DEFAULT 0,
  p_tax NUMERIC DEFAULT 0,
  p_notes TEXT DEFAULT '',
  p_device_id TEXT DEFAULT '',
  p_client_sale_id TEXT DEFAULT NULL,
  p_items JSONB DEFAULT '[]'::jsonb,
  p_timestamp TIMESTAMPTZ DEFAULT now(),
  p_seller_name TEXT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_sale_id BIGINT;
  v_seller_id UUID;
  v_item JSONB;
  v_product_name TEXT;
  v_current_stock NUMERIC;
BEGIN
  -- Validar que p_client_sale_id sea único
  IF p_client_sale_id IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.sales WHERE client_sale_id = p_client_sale_id) THEN
      SELECT id INTO v_sale_id 
      FROM public.sales 
      WHERE client_sale_id = p_client_sale_id;
      
      RAISE NOTICE 'Venta duplicada ignorada: %', p_client_sale_id;
      RETURN v_sale_id;
    END IF;
  END IF;

  -- Obtener o crear seller_id si se proporciona nombre
  IF p_seller_name IS NOT NULL THEN
    v_seller_id := public.update_seller_activity(p_seller_name, p_device_id);
  END IF;

  -- Insertar la venta principal
  INSERT INTO public.sales (
    ts,
    total,
    payment_method,
    cash_received,
    change_given,
    discount,
    tax,
    notes,
    device_id,
    client_sale_id,
    seller_id
  )
  VALUES (
    COALESCE(p_timestamp, now()),
    p_total,
    p_payment_method,
    p_cash_received,
    p_change_given,
    p_discount,
    p_tax,
    p_notes,
    p_device_id,
    p_client_sale_id,
    v_seller_id
  )
  RETURNING id INTO v_sale_id;

  -- Procesar cada item
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT name INTO v_product_name
    FROM public.products
    WHERE barcode = (v_item->>'barcode')::TEXT;

    v_product_name := COALESCE(v_product_name, v_item->>'name', 'Producto desconocido');

    INSERT INTO public.sale_items (
      sale_id,
      product_barcode,
      product_name,
      quantity,
      unit_price,
      subtotal,
      discount
    )
    VALUES (
      v_sale_id,
      (v_item->>'barcode')::TEXT,
      v_product_name,
      COALESCE((v_item->>'quantity')::NUMERIC, (v_item->>'qty')::NUMERIC, 1),
      COALESCE((v_item->>'price')::NUMERIC, (v_item->>'unit_price')::NUMERIC, 0),
      COALESCE((v_item->>'subtotal')::NUMERIC, 
               (v_item->>'quantity')::NUMERIC * (v_item->>'price')::NUMERIC, 
               0),
      COALESCE((v_item->>'discount')::NUMERIC, 0)
    );

    UPDATE public.products
    SET stock = stock - COALESCE((v_item->>'quantity')::NUMERIC, (v_item->>'qty')::NUMERIC, 0)
    WHERE barcode = (v_item->>'barcode')::TEXT;

    SELECT stock INTO v_current_stock
    FROM public.products
    WHERE barcode = (v_item->>'barcode')::TEXT;

    IF v_current_stock IS NOT NULL AND 
       v_current_stock <= COALESCE(
         (SELECT reorder_threshold FROM public.products WHERE barcode = (v_item->>'barcode')::TEXT),
         10
       ) THEN
      RAISE NOTICE 'ALERTA: Stock bajo para producto % (stock actual: %)', 
        (v_item->>'barcode')::TEXT, 
        v_current_stock;
    END IF;
  END LOOP;

  RETURN v_sale_id;
END;
$$;

-- =============================================================================
-- PASO 10: CREAR VISTA PARA REPORTES DE VENDEDORES
-- =============================================================================

CREATE OR REPLACE VIEW public.sales_by_seller AS
SELECT 
  s.seller_id,
  se.name as seller_name,
  DATE(s.ts) as sale_date,
  COUNT(s.id) as total_sales,
  SUM(s.total) as total_amount,
  SUM(s.discount) as total_discount,
  AVG(s.total) as average_sale
FROM public.sales s
LEFT JOIN public.sellers se ON s.seller_id = se.id
WHERE s.ts >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY s.seller_id, se.name, DATE(s.ts)
ORDER BY sale_date DESC, total_amount DESC;

-- =============================================================================
-- PASO 11: AGREGAR COMENTARIOS
-- =============================================================================

COMMENT ON TABLE public.sellers IS 'Vendedores/cajeros de la app móvil';
COMMENT ON COLUMN public.sellers.name IS 'Nombre único del vendedor (usado para login en app móvil)';
COMMENT ON COLUMN public.sellers.user_id IS 'Relación con usuario de la tienda web (opcional)';
COMMENT ON COLUMN public.sellers.device_id IS 'ID del dispositivo móvil del vendedor';
COMMENT ON COLUMN public.sellers.last_sync IS 'Última vez que este vendedor sincronizó datos';
COMMENT ON COLUMN public.sales.seller_id IS 'Vendedor que realizó la venta';

-- =============================================================================
-- VERIFICACIÓN
-- =============================================================================

-- Ver todos los vendedores
-- SELECT * FROM public.sellers ORDER BY name;

-- Ver ventas por vendedor
-- SELECT * FROM public.sales_by_seller;

-- Ver ventas de un vendedor específico
-- SELECT s.*, se.name as seller_name
-- FROM public.sales s
-- JOIN public.sellers se ON s.seller_id = se.id
-- WHERE se.name = 'MARIANA'
-- ORDER BY s.ts DESC
-- LIMIT 10;

