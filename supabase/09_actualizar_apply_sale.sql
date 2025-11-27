-- =============================================================================
-- SCRIPT 9: ACTUALIZAR FUNCIÓN apply_sale PARA USAR sale_items
-- =============================================================================
-- Fecha: 2025-10-28
-- Propósito: Actualizar función para almacenar items en tabla sale_items
-- IMPORTANTE: Debe ejecutarse DESPUÉS del script 08
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
  p_timestamp TIMESTAMPTZ DEFAULT now()
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_sale_id BIGINT;
  v_item JSONB;
  v_product_name TEXT;
  v_current_stock NUMERIC;
BEGIN
  -- Validar que p_client_sale_id sea único si se proporciona
  IF p_client_sale_id IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.sales WHERE client_sale_id = p_client_sale_id) THEN
      -- Si ya existe, retornar el ID existente (evitar duplicados)
      SELECT id INTO v_sale_id 
      FROM public.sales 
      WHERE client_sale_id = p_client_sale_id;
      
      RAISE NOTICE 'Venta duplicada ignorada: %', p_client_sale_id;
      RETURN v_sale_id;
    END IF;
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
    client_sale_id
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
    p_client_sale_id
  )
  RETURNING id INTO v_sale_id;

  -- Procesar cada item del array JSON
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    -- Obtener nombre del producto
    SELECT name INTO v_product_name
    FROM public.products
    WHERE barcode = (v_item->>'barcode')::TEXT;

    -- Si no existe el producto, usar el nombre del item
    v_product_name := COALESCE(v_product_name, v_item->>'name', 'Producto desconocido');

    -- Insertar item en sale_items
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

    -- Actualizar stock del producto (decrementar)
    UPDATE public.products
    SET stock = stock - COALESCE((v_item->>'quantity')::NUMERIC, (v_item->>'qty')::NUMERIC, 0)
    WHERE barcode = (v_item->>'barcode')::TEXT;

    -- Verificar si el stock quedó bajo el umbral de reorden
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
-- PASO 2: AGREGAR COMENTARIO A LA FUNCIÓN
-- =============================================================================

COMMENT ON FUNCTION public.apply_sale IS 
'Registra una venta completa con sus items. Actualiza automáticamente el stock de productos y detecta niveles bajos de inventario.';

-- =============================================================================
-- PASO 3: CREAR FUNCIÓN AUXILIAR PARA OBTENER ITEMS DE UNA VENTA
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_sale_items(p_sale_id BIGINT)
RETURNS TABLE (
  barcode TEXT,
  name TEXT,
  quantity NUMERIC,
  unit_price NUMERIC,
  subtotal NUMERIC,
  discount NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT 
    product_barcode,
    product_name,
    quantity,
    unit_price,
    subtotal,
    discount
  FROM public.sale_items
  WHERE sale_id = p_sale_id
  ORDER BY id;
$$;

-- =============================================================================
-- PASO 4: CREAR FUNCIÓN PARA ANULAR UNA VENTA
-- =============================================================================

CREATE OR REPLACE FUNCTION public.void_sale(p_sale_id BIGINT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_item RECORD;
BEGIN
  -- Verificar que la venta existe
  IF NOT EXISTS (SELECT 1 FROM public.sales WHERE id = p_sale_id) THEN
    RAISE EXCEPTION 'Venta % no encontrada', p_sale_id;
  END IF;

  -- Revertir el stock de cada item
  FOR v_item IN 
    SELECT product_barcode, quantity 
    FROM public.sale_items 
    WHERE sale_id = p_sale_id
  LOOP
    UPDATE public.products
    SET stock = stock + v_item.quantity
    WHERE barcode = v_item.product_barcode;
  END LOOP;

  -- Marcar la venta como anulada (agregar columna voided si no existe)
  -- O simplemente eliminar los items y la venta
  DELETE FROM public.sale_items WHERE sale_id = p_sale_id;
  DELETE FROM public.sales WHERE id = p_sale_id;

  RETURN TRUE;
END;
$$;

-- =============================================================================
-- VERIFICACIÓN
-- =============================================================================

-- Probar la función con datos de ejemplo:
/*
SELECT public.apply_sale(
  p_total := 100.50,
  p_payment_method := 'cash',
  p_cash_received := 150.00,
  p_change_given := 49.50,
  p_discount := 0,
  p_tax := 0,
  p_notes := 'Venta de prueba',
  p_device_id := 'test-device-001',
  p_client_sale_id := 'test-' || gen_random_uuid()::text,
  p_items := '[
    {
      "barcode": "7501234567890",
      "name": "Producto Test",
      "quantity": 2,
      "price": 50.25,
      "subtotal": 100.50
    }
  ]'::jsonb,
  p_timestamp := now()
);
*/

-- Ver items de una venta:
-- SELECT * FROM public.get_sale_items(1);

-- Ver ventas con items:
-- SELECT * FROM public.sales_with_items LIMIT 10;

