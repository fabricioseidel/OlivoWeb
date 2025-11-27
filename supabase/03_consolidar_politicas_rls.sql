-- =============================================================================
-- SCRIPT 3: CONSOLIDAR POLÍTICAS RLS DUPLICADAS
-- =============================================================================
-- Fecha: 2025-10-28
-- Propósito: Eliminar políticas RLS redundantes y consolidar en una sola política
-- por operación para mejorar el rendimiento
-- =============================================================================

-- =============================================================================
-- TABLA: products
-- =============================================================================

-- PASO 1: Eliminar todas las políticas existentes de products
DO $$ 
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'products' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.products', pol.policyname);
  END LOOP;
END $$;

-- PASO 2: Crear políticas consolidadas para products
CREATE POLICY "products_select_policy"
  ON public.products
  FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "products_insert_policy"
  ON public.products
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "products_update_policy"
  ON public.products
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "products_delete_policy"
  ON public.products
  FOR DELETE
  TO authenticated
  USING (true);

-- =============================================================================
-- TABLA: categories
-- =============================================================================

-- PASO 1: Eliminar todas las políticas existentes de categories
DO $$ 
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'categories' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.categories', pol.policyname);
  END LOOP;
END $$;

-- PASO 2: Crear políticas consolidadas para categories
CREATE POLICY "categories_select_policy"
  ON public.categories
  FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "categories_insert_policy"
  ON public.categories
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "categories_update_policy"
  ON public.categories
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "categories_delete_policy"
  ON public.categories
  FOR DELETE
  TO authenticated
  USING (true);

-- =============================================================================
-- TABLA: sales (si tiene políticas duplicadas)
-- =============================================================================

-- PASO 1: Eliminar todas las políticas existentes de sales
DO $$ 
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'sales' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.sales', pol.policyname);
  END LOOP;
END $$;

-- PASO 2: Crear políticas consolidadas para sales
CREATE POLICY "sales_select_policy"
  ON public.sales
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "sales_insert_policy"
  ON public.sales
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "sales_update_policy"
  ON public.sales
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "sales_delete_policy"
  ON public.sales
  FOR DELETE
  TO authenticated
  USING (true);

-- =============================================================================
-- VERIFICACIÓN
-- =============================================================================
-- Verifica que solo hay UNA política por tabla/operación:

-- SELECT 
--   tablename,
--   cmd AS operacion,
--   COUNT(*) AS cantidad_politicas,
--   STRING_AGG(policyname, ', ') AS nombres_politicas
-- FROM pg_policies
-- WHERE tablename IN ('products', 'categories', 'sales')
-- AND schemaname = 'public'
-- GROUP BY tablename, cmd
-- ORDER BY tablename, cmd;
