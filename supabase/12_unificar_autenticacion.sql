-- =============================================================================
-- SCRIPT 12: UNIFICAR AUTENTICACIÓN - MIGRAR VENDEDORES A USERS
-- =============================================================================
-- Fecha: 2025-10-28
-- Propósito: Crear autenticación unificada para vendedores y administradores
-- =============================================================================

-- PASO 1: Agregar columna user_id a sellers
-- -----------------------------------------------------------------------------
ALTER TABLE public.sellers 
  ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES public.users(id) ON DELETE SET NULL;

-- Crear índice para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_sellers_user_id ON public.sellers(user_id);

-- PASO 2: Crear enum para roles si no existe
-- -----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('ADMIN', 'SELLER', 'CUSTOMER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Actualizar tipo de columna role si es TEXT
ALTER TABLE public.users 
  ALTER COLUMN role TYPE TEXT;

-- PASO 3: Crear usuarios para vendedores existentes
-- -----------------------------------------------------------------------------
-- Contraseña temporal para todos: "Venta2025" (hash bcrypt)
-- Los vendedores deberán cambiarla en su primer acceso
INSERT INTO public.users (email, name, role, password_hash)
VALUES 
  ('mariana@tienda.local', 'MARIANA', 'SELLER', '$2a$10$vXq4QxJPYGZQxKdR0oYVHujEpLvJKZ3D4kXZ8zBMxYPq9RnHnRZC6'),
  ('ingrid@tienda.local', 'INGRID', 'SELLER', '$2a$10$vXq4QxJPYGZQxKdR0oYVHujEpLvJKZ3D4kXZ8zBMxYPq9RnHnRZC6'),
  ('alfredo@tienda.local', 'ALFREDO', 'SELLER', '$2a$10$vXq4QxJPYGZQxKdR0oYVHujEpLvJKZ3D4kXZ8zBMxYPq9RnHnRZC6'),
  ('fabricio@tienda.local', 'FABRICIO', 'SELLER', '$2a$10$vXq4QxJPYGZQxKdR0oYVHujEpLvJKZ3D4kXZ8zBMxYPq9RnHnRZC6'),
  ('maria@tienda.local', 'MARIA', 'SELLER', '$2a$10$vXq4QxJPYGZQxKdR0oYVHujEpLvJKZ3D4kXZ8zBMxYPq9RnHnRZC6'),
  ('pruebas@tienda.local', 'PRUEBAS', 'SELLER', '$2a$10$vXq4QxJPYGZQxKdR0oYVHujEpLvJKZ3D4kXZ8zBMxYPq9RnHnRZC6')
ON CONFLICT (email) DO NOTHING;

-- PASO 4: Vincular sellers con users recién creados
-- -----------------------------------------------------------------------------
UPDATE public.sellers s
SET user_id = u.id
FROM public.users u
WHERE UPPER(u.name) = UPPER(s.name)
  AND u.role = 'SELLER'
  AND s.user_id IS NULL;

-- PASO 5: Crear función helper para obtener seller_id desde user_id
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_seller_name_from_user(p_user_id TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_seller_name TEXT;
BEGIN
  SELECT name INTO v_seller_name
  FROM public.sellers
  WHERE user_id = p_user_id
  LIMIT 1;
  
  RETURN v_seller_name;
END;
$$;

-- PASO 6: Actualizar función apply_sale para aceptar user_id
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.apply_sale(
  p_items JSONB,
  p_total NUMERIC,
  p_payment_method TEXT DEFAULT 'efectivo',
  p_seller_name TEXT DEFAULT NULL,
  p_user_id TEXT DEFAULT NULL,
  p_timestamp TIMESTAMP DEFAULT NOW()
)
RETURNS TABLE(sale_id BIGINT, seller_id TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sale_id BIGINT;
  v_seller_name TEXT;
  v_item JSONB;
  v_barcode TEXT;
  v_quantity INTEGER;
  v_price NUMERIC;
  v_cost NUMERIC;
  v_product_name TEXT;
  v_discount NUMERIC;
  v_product_exists BOOLEAN;
BEGIN
  -- Determinar el nombre del vendedor
  v_seller_name := p_seller_name;
  
  -- Si se proporciona user_id, obtener seller_name desde la tabla sellers
  IF p_user_id IS NOT NULL THEN
    v_seller_name := get_seller_name_from_user(p_user_id);
  END IF;

  -- Insertar la venta
  INSERT INTO public.sales (total, payment_method, seller_id, created_at)
  VALUES (p_total, p_payment_method, v_seller_name, p_timestamp)
  RETURNING id INTO v_sale_id;

  -- Insertar los items de la venta
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_barcode := v_item->>'barcode';
    v_quantity := (v_item->>'qty')::INTEGER;
    v_price := (v_item->>'price')::NUMERIC;
    v_cost := COALESCE((v_item->>'cost')::NUMERIC, 0);
    v_product_name := v_item->>'name';
    v_discount := COALESCE((v_item->>'discount')::NUMERIC, 0);

    -- Verificar si el producto existe
    SELECT EXISTS(
      SELECT 1 FROM public.products WHERE barcode = v_barcode
    ) INTO v_product_exists;

    IF NOT v_product_exists THEN
      RAISE NOTICE 'Producto con código % no encontrado. Se usará nombre del item.', v_barcode;
    END IF;

    -- Insertar el item
    INSERT INTO public.sale_items (
      sale_id, 
      product_barcode, 
      product_name, 
      quantity, 
      price, 
      cost, 
      discount
    )
    VALUES (
      v_sale_id, 
      v_barcode, 
      v_product_name, 
      v_quantity, 
      v_price, 
      v_cost, 
      v_discount
    );

    -- Actualizar stock si el producto existe
    IF v_product_exists THEN
      UPDATE public.products
      SET stock = stock - v_quantity
      WHERE barcode = v_barcode;
    END IF;
  END LOOP;

  RETURN QUERY SELECT v_sale_id, v_seller_name;
END;
$$;

-- PASO 7: Verificar resultados
-- -----------------------------------------------------------------------------
SELECT 
  '=== USUARIOS VENDEDORES CREADOS ===' AS info,
  id, email, name, role
FROM public.users
WHERE role = 'SELLER'
ORDER BY name;

SELECT 
  '=== SELLERS VINCULADOS CON USERS ===' AS info,
  s.name AS seller_name,
  s.user_id,
  u.email AS user_email,
  u.role AS user_role
FROM public.sellers s
LEFT JOIN public.users u ON s.user_id = u.id
ORDER BY s.name;

-- PASO 8: Crear vista para facilitar consultas
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_seller_users AS
SELECT 
  s.name AS seller_name,
  s.device_id,
  s.last_sync,
  s.user_id,
  u.email,
  u.role,
  u.id AS user_table_id
FROM public.sellers s
LEFT JOIN public.users u ON s.user_id = u.id;

-- =============================================================================
-- NOTAS IMPORTANTES:
-- =============================================================================
-- 1. Contraseña temporal para todos los vendedores: "Venta2025"
-- 2. Los vendedores deben cambiar su contraseña en el primer acceso
-- 3. Emails con dominio @tienda.local (cambiar a dominio real si es necesario)
-- 4. La función apply_sale ahora acepta p_user_id para obtener seller_name automáticamente
-- 5. Rol SELLER permite acceso a app móvil y reportes web (sin modificar datos)
-- 6. Rol ADMIN permite acceso completo
-- 7. Rol CUSTOMER solo para compras públicas en tienda web
-- =============================================================================
