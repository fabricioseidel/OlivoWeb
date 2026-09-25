/**
 * Vuelve a pedirle el repartidor a Uber para un pedido flash ya pagado.
 *
 * Sin esto, un pedido cuyo despacho falló quedaba muerto: la entrega sólo se
 * creaba en el webhook de MercadoPago, o sea una única vez y en el instante del
 * pago. Si Uber decía que no —tarjeta de la tienda sin cupo, cotización
 * vencida, una caída de un minuto—, el pedido estaba pagado y no había forma de
 * despacharlo desde el sistema. La primera vez que pasó en producción hubo que
 * resolverlo a mano.
 *
 * Recotiza si hace falta, así que sirve aunque haya pasado un rato largo.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { requireApiAdminOrSeller } from '@/lib/api-auth';
import { despacharPedidoFlash } from '@/server/entrega-flash.service';

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAdminOrSeller();
  if (!auth.ok) return auth.response;

  const { id } = await params;

  const { data: order, error } = await supabaseServer
    .from('orders')
    .select('id, total, shipping_cost, shipping_method, shipping_address, payment_status, express_delivery_id')
    .eq('id', id)
    .single();

  if (error || !order) {
    return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
  }

  if (order.shipping_method !== 'flash') {
    return NextResponse.json(
      { error: 'Este pedido no es de envío flash.' },
      { status: 400 }
    );
  }

  // Regla 4: el repartidor se pide sólo con el pago confirmado. Vale igual acá,
  // aunque lo apriete una persona: una entrega sobre un pedido impago se cobra
  // lo mismo.
  if (order.payment_status !== 'paid') {
    return NextResponse.json(
      { error: 'El pedido todavía no está pagado. La entrega se pide con el pago confirmado.' },
      { status: 400 }
    );
  }

  if (order.express_delivery_id) {
    return NextResponse.json(
      { error: 'Este pedido ya tiene una entrega creada en Uber.' },
      { status: 409 }
    );
  }

  const resultado = await despacharPedidoFlash(
    order,
    auth.session.user?.email || auth.userId || 'admin'
  );

  if (!resultado.ok) {
    // 409 y no 500: no es un fallo del servidor, es Uber diciendo que no. El
    // panel muestra el motivo tal cual para que se pueda actuar sobre él.
    return NextResponse.json({ error: resultado.motivo }, { status: 409 });
  }

  return NextResponse.json({
    success: true,
    deliveryId: resultado.deliveryId,
    tracking: resultado.tracking,
  });
}
