import { NextRequest, NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { supabaseServer } from '@/lib/supabase-server';
import { auditLog } from '@/server/audit.service';
import { restoreOrderStock } from '@/server/inventory.service';
import { crearEntregaFlash } from '@/server/uber-direct.service';
import crypto from 'crypto';

/**
 * Valida la firma HMAC-SHA256 del webhook de MercadoPago.
 * Docs: https://www.mercadopago.com/developers/es/docs/your-integrations/notifications/webhooks#validacindeorigendelanotificacin
 * Manifest: `id:[data.id];request-id:[x-request-id];ts:[ts];`
 */
function verifyMercadoPagoSignature(request: NextRequest, dataId: string): boolean {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[MP Webhook] ⚠️ Sin secret en desarrollo — firma NO verificada');
      return true;
    }
    // En producción, sin secret no se procesa nada: fail-closed.
    console.error('[MP Webhook] ❌ MERCADOPAGO_WEBHOOK_SECRET ausente en producción — notificación rechazada');
    return false;
  }

  const xSignature = request.headers.get('x-signature');
  const xRequestId = request.headers.get('x-request-id');
  if (!xSignature || !xRequestId) return false;

  const parts: Record<string, string> = {};
  for (const part of xSignature.split(',')) {
    const [key, value] = part.split('=').map((s) => s?.trim());
    if (key && value) parts[key] = value;
  }
  const ts = parts['ts'];
  const v1 = parts['v1'];
  if (!ts || !v1) return false;

  const manifest = `id:${dataId.toLowerCase()};request-id:${xRequestId};ts:${ts};`;
  const expected = crypto.createHmac('sha256', secret).update(manifest).digest('hex');
  const expectedBuf = Buffer.from(expected);
  const receivedBuf = Buffer.from(v1);
  return expectedBuf.length === receivedBuf.length && crypto.timingSafeEqual(expectedBuf, receivedBuf);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // MercadoPago sends notifications in several formats.
    // We care about "payment" type.
    const url = new URL(request.url);
    const paymentId = url.searchParams.get('data.id') || body.data?.id || body.id;
    const type = body.type || body.topic;

    if (paymentId && !verifyMercadoPagoSignature(request, String(paymentId))) {
      console.error('[MP Webhook] ❌ Firma inválida — notificación rechazada');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    if (type === 'payment' && paymentId) {
      console.log(`[MP Webhook] Processing payment ID: ${paymentId}`);

      // Create client at runtime to ensure token is read from env
      const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN || '';
      if (!accessToken) {
        console.error('[MP Webhook] ❌ MERCADOPAGO_ACCESS_TOKEN no está definido');
        return NextResponse.json({ error: 'Token no configurado' }, { status: 500 });
      }

      const client = new MercadoPagoConfig({ accessToken, options: { timeout: 10000 } });
      const payment = new Payment(client);
      const paymentData = await payment.get({ id: paymentId });

      const status = paymentData.status;
      const orderId = paymentData.external_reference; // We stored orderId here during preference creation

      console.log(`[MP Webhook] Order: ${orderId} | Status: ${status}`);

      if (orderId && (status === 'approved' || status === 'authorized')) {
        // Verificar que el monto pagado coincide con el total de la orden
        const { data: order } = await supabaseServer
          .from('orders')
          .select('total, shipping_method, shipping_address')
          .eq('id', orderId)
          .single();

        const paidAmount = paymentData.transaction_amount ?? 0;
        if (order && Math.abs(Number(order.total) - paidAmount) > 1) {
          console.error(
            `[MP Webhook] ❌ Monto pagado (${paidAmount}) no coincide con el total de la orden ${orderId} (${order.total}) — no se marca como pagada`
          );
          return NextResponse.json({ received: true, flagged: 'amount_mismatch' }, { status: 200 });
        }

        // Update Order Status in Supabase to PAID
        const { error } = await supabaseServer
          .from('orders')
          .update({ 
            payment_status: 'paid',
            status: 'processing',
            updated_at: new Date().toISOString()
          })
          .eq('id', orderId);

        if (error) {
          console.error('[MP Webhook] Error updating order:', error);
          return NextResponse.json({ error: 'DB update failed' }, { status: 500 });
        }

        console.log(`[MP Webhook] ✅ Order ${orderId} marked as PAID`);
        await auditLog({
          action: 'ORDER_PAID',
          entity: 'orders',
          entityId: orderId,
          actor: 'mp-webhook',
          details: { paymentId: String(paymentId), amount: paidAmount, mpStatus: status },
        });

        // Regla 4 del envío flash: la entrega de Uber se crea acá y en ningún
        // otro lado. Al apretar comprar todavía no: un pago que después se
        // rechaza dejaría un repartidor en camino a buscar un pedido que nadie
        // pagó, y esa entrega se cobra igual.
        if (order?.shipping_method === 'flash') {
          await crearEntregaDePedidoPagado(orderId, order);
        }
      } else if (orderId && (status === 'rejected' || status === 'cancelled' || status === 'refunded' || status === 'in_mediation')) {
        console.log(`[MP Webhook] 🔄 Restaurando stock para orden ${orderId} debido a estado: ${status}`);

        // 1. Devolver al inventario lo que la orden tenía reservado.
        //    La traducción de `order_items.product_id` (que guarda `products.id`)
        //    al código de barras que usan las RPC vive en el servicio de
        //    inventario; acá sólo se informa el resultado.
        const devolucion = await restoreOrderStock(orderId, {
          reason: `MP_${status.toUpperCase()}`,
        });

        // 2. Marcar orden como cancelada/fallida. Se hace pase lo que pase con
        //    el stock: el pago se rechazó y la orden no puede quedar viva.
        await supabaseServer
          .from('orders')
          .update({ 
            payment_status: status,
            status: status === 'refunded' ? 'refunded' : 'cancelled',
            updated_at: new Date().toISOString()
          })
          .eq('id', orderId);

        // 3. Informar lo que pasó de verdad. Este log decía siempre "stock
        //    restaurado", incluso cuando no se había devuelto nada — que era
        //    exactamente el caso, porque el paso 1 fallaba en silencio.
        const quedoPendiente =
          !devolucion.ok || devolucion.fallidos > 0 || devolucion.sinResolver.length > 0;

        if (quedoPendiente) {
          console.error(
            `[MP Webhook] ⚠️ Orden ${orderId} actualizada a ${status}, pero el stock NO se devolvió por completo:`,
            devolucion.ok
              ? { devueltos: devolucion.devueltos, fallidos: devolucion.fallidos, sinResolver: devolucion.sinResolver }
              : { error: devolucion.error }
          );
        } else {
          console.log(
            `[MP Webhook] ❌ Orden ${orderId} actualizada a ${status}; se devolvieron ${devolucion.devueltos} ítems al stock.`
          );
        }

        await auditLog({
          action: 'ORDER_PAYMENT_FAILED',
          entity: 'orders',
          entityId: orderId,
          actor: 'mp-webhook',
          details: {
            paymentId: String(paymentId),
            mpStatus: status,
            stock: devolucion.ok
              ? {
                  devueltos: devolucion.devueltos,
                  fallidos: devolucion.fallidos,
                  sinResolver: devolucion.sinResolver,
                }
              : { error: devolucion.error },
          },
        });
      }
    }

    // Always return 200 to MercadoPago to avoid retries
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('[MP Webhook] Error processing webhook:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

/**
 * Despacha la entrega de Uber de un pedido flash ya pagado.
 *
 * Nunca lanza: el pago ya está confirmado y el pedido ya quedó marcado. Si
 * Uber falla, este webhook igual tiene que responder 200 — si devolviera error,
 * MercadoPago reintentaría y cada reintento crearía otra entrega. Un pedido
 * pagado sin repartidor asignado se resuelve a mano; tres repartidores
 * cobrados por el mismo pedido, no.
 */
async function crearEntregaDePedidoPagado(
  orderId: string,
  order: { shipping_address?: unknown; total?: number | string | null }
): Promise<void> {
  const dir = (order.shipping_address ?? {}) as Record<string, unknown>;

  // Idempotencia: MercadoPago reenvía el mismo webhook más de una vez.
  if (dir.uberDeliveryId) {
    console.log(`[MP Webhook] La orden ${orderId} ya tiene entrega de Uber; no se crea otra.`);
    return;
  }

  const quoteId = dir.uberQuoteId ? String(dir.uberQuoteId) : null;
  if (!quoteId) {
    console.error(`[MP Webhook] ❌ Orden flash ${orderId} sin uberQuoteId: hay que despacharla a mano.`);
    await auditLog({
      action: 'UBER_DELIVERY_FAILED',
      entity: 'orders',
      entityId: orderId,
      actor: 'mp-webhook',
      details: { motivo: 'sin-quote-id' },
    });
    return;
  }

  try {
    const entrega = await crearEntregaFlash({
      quoteId,
      destino: {
        calle: String(dir.address || ''),
        comuna: String(dir.city || ''),
        codigoPostal: dir.zipCode ? String(dir.zipCode) : undefined,
        lat: (dir.coords as { lat?: number })?.lat ?? null,
        lng: (dir.coords as { lng?: number })?.lng ?? null,
      },
      nombreCliente: String(dir.fullName || 'Cliente'),
      telefonoCliente: String(dir.phone || ''),
      referenciaPedido: String(orderId),
      // Valor declarado, para el seguro de Uber ante pérdida o daño.
      valorPedidoCLP: Number(order.total) || 0,
    });

    await supabaseServer
      .from('orders')
      .update({
        shipping_address: { ...dir, uberDeliveryId: entrega.id, uberTracking: entrega.tracking },
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    console.log(`[MP Webhook] 🛵 Entrega de Uber creada para la orden ${orderId}: ${entrega.id}`);
    await auditLog({
      action: 'UBER_DELIVERY_CREATED',
      entity: 'orders',
      entityId: orderId,
      actor: 'mp-webhook',
      details: { deliveryId: entrega.id, quoteId },
    });
  } catch (e) {
    // El pedido queda pagado y sin repartidor. Se registra fuerte para que se
    // note y se despache a mano: es preferible a no cobrar o a duplicar.
    console.error(`[MP Webhook] ❌ No se pudo crear la entrega de Uber de la orden ${orderId}:`, e);
    await auditLog({
      action: 'UBER_DELIVERY_FAILED',
      entity: 'orders',
      entityId: orderId,
      actor: 'mp-webhook',
      details: { motivo: e instanceof Error ? e.message : String(e), quoteId },
    });
  }
}
