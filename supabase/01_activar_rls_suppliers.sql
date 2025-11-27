-- =============================================================================
-- SCRIPT 1: ACTIVAR ROW-LEVEL SECURITY EN TABLAS DE PROVEEDORES
-- =============================================================================
-- Fecha: 2025-10-28
-- Propósito: Activar RLS en suppliers y product_suppliers para proteger datos
-- IMPORTANTE: Este script activa RLS. Después de ejecutarlo, solo usuarios
-- autenticados podrán acceder a estas tablas.
-- =============================================================================

-- Activar RLS en tabla suppliers
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- Activar RLS en tabla product_suppliers
ALTER TABLE public.product_suppliers ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- POLÍTICAS PARA TABLA: suppliers
-- =============================================================================

-- Política: Cualquier usuario autenticado puede VER proveedores
CREATE POLICY "Usuarios autenticados pueden ver proveedores"
  ON public.suppliers
  FOR SELECT
  TO authenticated
  USING (true);

-- Política: Cualquier usuario autenticado puede INSERTAR proveedores
CREATE POLICY "Usuarios autenticados pueden crear proveedores"
  ON public.suppliers
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Política: Cualquier usuario autenticado puede ACTUALIZAR proveedores
CREATE POLICY "Usuarios autenticados pueden actualizar proveedores"
  ON public.suppliers
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Política: Cualquier usuario autenticados pueden ELIMINAR proveedores
CREATE POLICY "Usuarios autenticados pueden eliminar proveedores"
  ON public.suppliers
  FOR DELETE
  TO authenticated
  USING (true);

-- =============================================================================
-- POLÍTICAS PARA TABLA: product_suppliers
-- =============================================================================

-- Política: Cualquier usuario autenticado puede VER relaciones producto-proveedor
CREATE POLICY "Usuarios autenticados pueden ver product_suppliers"
  ON public.product_suppliers
  FOR SELECT
  TO authenticated
  USING (true);

-- Política: Cualquier usuario autenticado puede INSERTAR relaciones
CREATE POLICY "Usuarios autenticados pueden crear product_suppliers"
  ON public.product_suppliers
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Política: Cualquier usuario autenticado puede ACTUALIZAR relaciones
CREATE POLICY "Usuarios autenticado pueden actualizar product_suppliers"
  ON public.product_suppliers
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Política: Cualquier usuario autenticado puede ELIMINAR relaciones
CREATE POLICY "Usuarios autenticados pueden eliminar product_suppliers"
  ON public.product_suppliers
  FOR DELETE
  TO authenticated
  USING (true);

-- =============================================================================
-- VERIFICACIÓN
-- =============================================================================
-- Ejecuta estas consultas para verificar que RLS está activado:

-- SELECT tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public' 
-- AND tablename IN ('suppliers', 'product_suppliers');

-- SELECT schemaname, tablename, policyname, roles, cmd
-- FROM pg_policies
-- WHERE tablename IN ('suppliers', 'product_suppliers')
-- ORDER BY tablename, cmd;
