import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

/**
 * Estado mínimo de un pedido, accesible sin sesión.
 *
 * El checkout permite comprar como invitado (`user_id` queda en NULL), pero
 * `/api/orders/[id]` exige sesión y filtra por usuario, así que un invitado no
 * podía ver si su pago se había acreditado: la página de confirmación se
 * quedaba sin datos y caía al query param.
 *
 * Este endpoint devuelve SOLO el estado y el monto — nunca la dirección, el
 * nombre ni el teléfono. El id del pedido es un UUID que el cliente ya tiene en
 * su URL y en su email de confirmación, y con él aquí no se obtiene ningún dato
 * personal.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Un id malformado no debe llegar a la consulta.
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  if (!isUuid) {
    return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
  }

  const { data: order, error } = await supabaseServer
    .from('orders')
    .select('id, status, payment_status, payment_method, total, created_at')
    .eq('id', id)
    .maybeSingle();

  if (error || !order) {
    return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
  }

  return NextResponse.json({
    id: order.id,
    status: order.status,
    payment_status: order.payment_status,
    payment_method: order.payment_method,
    total: order.total,
    created_at: order.created_at,
  });
}
