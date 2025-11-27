-- =============================================================================
-- SCRIPT 2: FIJAR search_path EN FUNCIONES PARA SEGURIDAD
-- =============================================================================
-- Fecha: 2025-10-28
-- Propósito: Configurar search_path explícito en funciones apply_sale y set_updated_at
-- IMPORTANTE: Esto previene comportamientos inesperados por contextos cambiantes
-- =============================================================================

-- =============================================================================
-- FUNCIÓN: set_updated_at
-- =============================================================================
-- Esta función actualiza automáticamente el campo updated_at en tablas

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public, pg_temp
SECURITY DEFINER;

-- Agregar comentario para documentación
COMMENT ON FUNCTION public.set_updated_at() IS 
  'Función trigger que actualiza automáticamente updated_at. 
   search_path fijado para seguridad.';

-- =============================================================================
-- FUNCIÓN: apply_sale (necesita ser creada/recreada)
-- =============================================================================
-- Esta función procesa ventas desde dispositivos móviles

CREATE OR REPLACE FUNCTION public.apply_sale(
  p_total NUMERIC,
  p_payment_method TEXT,
  p_cash_received NUMERIC DEFAULT 0,
  p_change_given NUMERIC DEFAULT 0,
  p_discount NUMERIC DEFAULT 0,
  p_tax NUMERIC DEFAULT 0,
  p_notes TEXT DEFAULT '',
  p_device_id TEXT DEFAULT NULL,
  p_client_sale_id TEXT DEFAULT NULL,
  p_items JSONB DEFAULT '[]'::JSONB,
  p_timestamp TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_sale_id UUID;
  v_item JSONB;
  v_barcode TEXT;
  v_quantity INTEGER;
BEGIN
  -- Insertar venta en tabla sales
  INSERT INTO public.sales (
    total,
    payment_method,
    cash_received,
    change_given,
    discount,
    tax,
    notes,
    device_id,
    client_sale_id,
    items_json,
    ts
  ) VALUES (
    p_total,
    p_payment_method,
    p_cash_received,
    p_change_given,
    p_discount,
    p_tax,
    p_notes,
    p_device_id,
    p_client_sale_id,
    p_items,
    COALESCE(p_timestamp, NOW())
  )
  RETURNING id INTO v_sale_id;

  -- Actualizar stock de productos
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_barcode := v_item->>'barcode';
    v_quantity := (v_item->>'quantity')::INTEGER;
    
    UPDATE public.products
    SET stock = GREATEST(0, stock - v_quantity)
    WHERE barcode = v_barcode;
  END LOOP;

  RETURN v_sale_id;
END;
$$ LANGUAGE plpgsql
SET search_path = public, pg_temp
SECURITY DEFINER;

-- Agregar comentario
COMMENT ON FUNCTION public.apply_sale(NUMERIC, TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT, TEXT, JSONB, TIMESTAMPTZ) IS
  'Procesa una venta desde la app móvil, actualiza stock de productos.
   search_path fijado para seguridad.';

-- =============================================================================
-- VERIFICACIÓN
-- =============================================================================
-- Verifica que las funciones tengan search_path configurado:

-- SELECT 
--   p.proname AS function_name,
--   pg_get_functiondef(p.oid) AS definition
-- FROM pg_proc p
-- JOIN pg_namespace n ON p.pronamespace = n.oid
-- WHERE n.nspname = 'public'
-- AND p.proname IN ('set_updated_at', 'apply_sale');
