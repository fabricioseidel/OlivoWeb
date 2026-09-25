import { NextRequest, NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { supabaseServer } from '@/lib/supabase-server';
import { auditLog } from '@/server/audit.service';
import { despacharPedidoFlash } from '@/server/entrega-flash.service';
import { earnPoints } from '@/server/loyalty.service';
import { cancelarPedido } from '@/server/order-cancel.service';
import crypto from 'crypto';
import { montoCobrado } from '@/lib/mercadopago-monto';

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
          .select('status, total, shipping_cost, shipping_method, shipping_address, express_delivery_id')
          .eq('id', orderId)
          .single();

        // Un pago que entra sobre un pedido ya cancelado no se acredita solo:
        // el stock y el cupón ya se devolvieron, y marcarlo pagado dejaría un
        // pedido en preparación sin mercadería reservada. Los links de pago
        // vencen antes de que el cron cancele, así que esto no debería pasar;
        // si pasa, lo resuelve una persona (reembolso o reponer el pedido).
        if (order && (order.status === 'cancelled' || order.status === 'refunded')) {
          console.error(`[MP Webhook] ⚠️ Pago ${paymentId} aprobado sobre la orden cancelada ${orderId}`);
          await auditLog({
            action: 'ORDER_PAID_AFTER_CANCEL',
            entity: 'orders',
            entityId: orderId,
            actor: 'mp-webhook',
            details: { paymentId: String(paymentId), mpStatus: status },
          });
          return NextResponse.json({ received: true, flagged: 'paid_after_cancel' }, { status: 200 });
        }

        const paidAmount = montoCobrado(paymentData);
        if (order && Math.abs(Number(order.total) - paidAmount) > 1) {
          // El desglose va en el log a propósito: la vez que esto falló de
          // verdad, el número suelto no decía que la diferencia era exactamente
          // el envío, y por ahí pasaba el error.
          console.error(
            `[MP Webhook] ❌ Monto pagado (${paidAmount} = ítems ${paymentData.transaction_amount ?? 0} + envío ${(paymentData as { shipping_amount?: number }).shipping_amount ?? 0}) no coincide con el total de la orden ${orderId} (${order.total}) — no se marca como pagada`
          );
          return NextResponse.json({ received: true, flagged: 'amount_mismatch' }, { status: 200 });
        }

        // Marcar como pagada, una sola vez. MercadoPago reenvía la misma
        // notificación varias veces —hoy llegaron siete del mismo pago—, y sin
        // el filtro dentro del UPDATE cada reintento volvía a acreditar los
        // puntos de fidelidad y a duplicar el registro de auditoría.
        const { data: acreditadas, error } = await supabaseServer
          .from('orders')
          .update({
            payment_status: 'paid',
            status: 'processing',
            updated_at: new Date().toISOString()
          })
          .eq('id', orderId)
          .neq('payment_status', 'paid')
          .select('id');

        if (error) {
          console.error('[MP Webhook] Error updating order:', error);
          return NextResponse.json({ error: 'DB update failed' }, { status: 500 });
        }

        const primeraVez = (acreditadas?.length ?? 0) > 0;

        if (primeraVez) {
          console.log(`[MP Webhook] ✅ Order ${orderId} marked as PAID`);
          await auditLog({
            action: 'ORDER_PAID',
            entity: 'orders',
            entityId: orderId,
            actor: 'mp-webhook',
            details: { paymentId: String(paymentId), amount: paidAmount, mpStatus: status },
          });

          // Los puntos se ganan acá y no al crear el pedido. Antes se daban al
          // apretar comprar, sin nada que los revirtiera: bastaba llegar al
          // checkout y abandonar el pago para acumular puntos gastables.
          try {
            const dirPuntos = (order?.shipping_address ?? {}) as Record<string, any>;
            if (dirPuntos.email) {
              await earnPoints({
                customerEmail: dirPuntos.email,
                amount: Number(order?.total) || 0,
                referenceType: 'order',
                referenceId: orderId,
              });
            }
          } catch (e) {
            console.warn('[MP Webhook] No se pudieron acreditar los puntos:', e);
          }
        } else {
          console.log(`[MP Webhook] La orden ${orderId} ya estaba pagada; no se acredita dos veces.`);
        }

        // Regla 4 del envío flash: la entrega de Uber se crea acá y en ningún
        // otro lado. Al apretar comprar todavía no: un pago que después se
        // rechaza dejaría un repartidor en camino a buscar un pedido que nadie
        // pagó, y esa entrega se cobra igual.
        if (order?.shipping_method === 'flash') {
          await despacharPedidoFlash({ id: orderId, ...order }, 'mp-webhook');
        }
      } else if (orderId && status === 'in_mediation') {
        // Una disputa abierta **no** es un pago fallido: la plata sigue ahí
        // mientras MercadoPago decide. Tratarla como rechazo cancelaba un
        // pedido ya pagado y devolvía al inventario stock que muy
        // probablemente ya salió del local. Se registra y se deja quieto.
        console.warn(`[MP Webhook] ⚠️ Orden ${orderId} en mediación — no se toca el pedido`);
        await auditLog({
          action: 'ORDER_IN_MEDIATION',
          entity: 'orders',
          entityId: orderId,
          actor: 'mp-webhook',
          details: { paymentId: String(paymentId) },
        });
        return NextResponse.json({ received: true, flagged: 'in_mediation' }, { status: 200 });
      } else if (orderId && status === 'rejected') {
        // Un pago rechazado es **un intento** fallido, no el fin del pedido: la
        // tarjeta sin fondos o mal tipeada se arregla probando otra vez, y la
        // pantalla de confirmación ofrece justamente eso. Antes el rechazo
        // cancelaba el pedido en el acto, así que el botón "reintentar"
        // respondía "pedido cancelado" y el cupón de un solo uso quedaba
        // gastado. Se marca el intento y el pedido sigue pendiente.
        //
        // No se pisa un pedido ya pagado: si el cliente reintentó y pagó, el
        // aviso atrasado del primer rechazo puede llegar después.
        await supabaseServer
          .from('orders')
          .update({ payment_status: 'rejected', updated_at: new Date().toISOString() })
          .eq('id', orderId)
          .neq('payment_status', 'paid')
          .not('status', 'in', '("cancelled","refunded")');

        await auditLog({
          action: 'ORDER_PAYMENT_REJECTED',
          entity: 'orders',
          entityId: orderId,
          actor: 'mp-webhook',
          details: { paymentId: String(paymentId) },
        });
        return NextResponse.json({ received: true, flagged: 'rejected_retryable' }, { status: 200 });
      } else if (orderId && (status === 'cancelled' || status === 'refunded')) {
        const r = await cancelarPedido(orderId, {
          estadoPago: status,
          actor: 'mp-webhook',
          motivo:
            status === 'refunded'
              ? 'Pago reembolsado en Mercado Pago'
              : 'Pago no completado en Mercado Pago',
          detalles: { paymentId: String(paymentId), mpStatus: status },
        });

        if (!r.ok) {
          console.error(`[MP Webhook] Error cancelando la orden ${orderId}:`, r.error);
          return NextResponse.json({ received: true, flagged: 'update_failed' }, { status: 200 });
        }
        if (!r.cancelada) {
          console.log(`[MP Webhook] La orden ${orderId} ya estaba cancelada o pagada; no se deshace.`);
          return NextResponse.json({ received: true, flagged: 'ya_cancelada' }, { status: 200 });
        }
        console.log(`[MP Webhook] ❌ Orden ${orderId} cancelada (${status}).`);
      }
    }

    // Always return 200 to MercadoPago to avoid retries
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('[MP Webhook] Error processing webhook:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
