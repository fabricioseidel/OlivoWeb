import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { requireApiAuth } from '@/lib/api-auth';
import { createPaymentPreference } from '@/server/payments.service';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

/**
 * Regenera el link de pago de MercadoPago para una orden que quedó pendiente.
 *
 * Sin este endpoint, un cliente que abandona o falla el pago en MercadoPago no
 * tiene forma de volver a pagar: la orden queda en `pending` para siempre con el
 * stock ya reservado, y la única salida es rehacer el carrito, lo que crea una
 * orden duplicada y descuenta el stock otra vez.
 *
 * Es seguro llamarlo varias veces: no toca stock ni totales, solo pide a
 * MercadoPago una preferencia nueva para la misma orden. El monto se toma de la
 * BD (nunca del navegador) y `external_reference` sigue siendo el mismo orderId,
 * así que el webhook concilia igual que en el primer intento.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const auth = await requireApiAuth();
    if (!auth.ok) return auth.response;

    const { allowed, retryAfterSeconds } = rateLimit(`retry-payment:${getClientIp(request)}`, {
      limit: 10,
      windowMs: 5 * 60 * 1000,
    });
    if (!allowed) {
      return NextResponse.json(
        { error: 'Demasiados intentos. Espera un momento antes de reintentar.' },
        { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
      );
    }

    // Solo el dueño de la orden puede regenerar su pago.
    const { data: order, error } = await supabaseServer
      .from('orders')
      .select('id, user_id, total, shipping_cost, discount_amount, status, payment_status, payment_method, shipping_address, order_items(name, quantity, price, product_id)')
      .eq('id', id)
      .eq('user_id', auth.userId)
      .maybeSingle();

    if (error || !order) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
    }

    if (order.payment_status === 'paid') {
      return NextResponse.json({ error: 'Este pedido ya está pagado.' }, { status: 409 });
    }
    if (order.status === 'cancelled' || order.status === 'refunded') {
      return NextResponse.json(
        { error: 'Este pedido fue cancelado. Vuelve a armar tu carrito para comprarlo.' },
        { status: 409 }
      );
    }
    if (order.payment_method !== 'mercadopago') {
      return NextResponse.json(
        { error: 'Este pedido no se paga con MercadoPago.' },
        { status: 400 }
      );
    }

    const items = (order.order_items || []) as Array<{
      name: string; quantity: number; price: number; product_id: string;
    }>;
    if (items.length === 0) {
      return NextResponse.json({ error: 'El pedido no tiene productos.' }, { status: 400 });
    }

    const total = Number(order.total);
    if (!Number.isFinite(total) || total <= 0) {
      return NextResponse.json({ error: 'El total del pedido no es válido.' }, { status: 400 });
    }

    const customerEmail =
      (order.shipping_address as any)?.email || auth.session.user?.email || 'anon@olivomarket.cl';

    const mp = await createPaymentPreference({
      orderId: String(order.id),
      items: items.map((i) => ({
        id: String(i.product_id),
        name: i.name,
        quantity: Number(i.quantity),
        price: Number(i.price),
      })),
      customerEmail,
      total,
      shippingCost: Number(order.shipping_cost || 0),
      discountTotal: Number(order.discount_amount || 0),
    });

    return NextResponse.json({ success: true, orderId: order.id, initPoint: mp.initPoint });
  } catch (err: any) {
    console.error('[RetryPayment] Error regenerando preferencia:', err?.message || err);
    return NextResponse.json(
      { error: 'No pudimos regenerar el link de pago. Intenta de nuevo en unos minutos.' },
      { status: 502 }
    );
  }
}
