-- Las tres funciones del motor de reposición que se tocaron en esta sesión
-- quedaron sin `SET search_path`, a diferencia de las dos funciones nuevas de
-- precios (record_supplier_cost_change, marcar_pedido_enviado) que sí lo
-- llevan. Sin un search_path fijo, una función SECURITY DEFINER puede quedar
-- expuesta a que alguien con permiso de crear objetos en un esquema anterior
-- en el path intercepte una llamada no calificada. Estas no son
-- SECURITY DEFINER, pero fijar el search_path igual es la práctica correcta
-- y no cambia ningún comportamiento: son las mismas funciones, mismo cuerpo.

ALTER FUNCTION public.get_reorder_suggestions(int, int, int)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.create_draft_supplier_orders(int, int, int, uuid)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.recalculate_supplier_order_total()
  SET search_path = public, pg_temp;
