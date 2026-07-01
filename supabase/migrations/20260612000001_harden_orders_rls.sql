-- Endurece RLS en orders/order_items (hallazgo #11 de la auditoría de seguridad).
--
-- Contexto: toda la escritura legítima pasa por las API routes con la
-- service-role key (bypassa RLS). Los clientes anon/authenticated solo deben
-- poder LEER sus propias órdenes; nunca insertar, modificar ni borrar
-- directamente contra PostgREST.
--
-- Las políticas SELECT existentes ("Users can view their own orders" /
-- "Users can view their own order items") se mantienen. Al no existir
-- políticas de INSERT/UPDATE/DELETE, esas operaciones ya están denegadas por
-- defecto con RLS habilitado; este archivo lo hace explícito y a prueba de
-- futuras políticas permisivas accidentales usando políticas RESTRICTIVE.

-- orders: bloquear escritura de clientes (anon y authenticated)
DROP POLICY IF EXISTS "Block client inserts on orders" ON public.orders;
CREATE POLICY "Block client inserts on orders" ON public.orders
  AS RESTRICTIVE FOR INSERT TO anon, authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "Block client updates on orders" ON public.orders;
CREATE POLICY "Block client updates on orders" ON public.orders
  AS RESTRICTIVE FOR UPDATE TO anon, authenticated
  USING (false);

DROP POLICY IF EXISTS "Block client deletes on orders" ON public.orders;
CREATE POLICY "Block client deletes on orders" ON public.orders
  AS RESTRICTIVE FOR DELETE TO anon, authenticated
  USING (false);

-- order_items: idem
DROP POLICY IF EXISTS "Block client inserts on order_items" ON public.order_items;
CREATE POLICY "Block client inserts on order_items" ON public.order_items
  AS RESTRICTIVE FOR INSERT TO anon, authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "Block client updates on order_items" ON public.order_items;
CREATE POLICY "Block client updates on order_items" ON public.order_items
  AS RESTRICTIVE FOR UPDATE TO anon, authenticated
  USING (false);

DROP POLICY IF EXISTS "Block client deletes on order_items" ON public.order_items;
CREATE POLICY "Block client deletes on order_items" ON public.order_items
  AS RESTRICTIVE FOR DELETE TO anon, authenticated
  USING (false);
