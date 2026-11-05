import { NextRequest, NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { supabaseServer } from '@/lib/supabase-server';
import { auditLog } from '@/server/audit.service';
import { restoreOrderStock } from '@/server/inventory.service';
import { despacharPedidoFlash } from '@/server/entrega-flash.service';
import { addBonusPoints, earnPoints } from '@/server/loyalty.service';
import { sendOrderCancelledEmail, sendOrderConfirmation } from '@/server/email.service';
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
          .select('total, shipping_cost, shipping_method, shipping_address, express_delivery_id, payment_method, order_items(name, quantity, price)')
          .eq('id', orderId)
          .single();

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

          // El correo de "orden confirmada" sale acá y no al crear el pedido.
          // Antes salía al apretar comprar: quien abandonaba el pago recibía
          // igual la confirmación de una compra que nunca ocurrió.
          try {
            const dirCorreo = (order?.shipping_address ?? {}) as Record<string, any>;
            const lineas = (order as { order_items?: Array<{ name: string; quantity: number; price: number }> })
              ?.order_items ?? [];
            if (dirCorreo.email) {
              await sendOrderConfirmation({
                to: dirCorreo.email,
                customerName: dirCorreo.fullName || 'Cliente',
                orderId: orderId,
                total: Number(order?.total) || 0,
                itemCount: lineas.length,
                paymentMethod: order?.payment_method || 'MercadoPago',
                items: lineas.map((i) => ({
                  name: i.name,
                  quantity: Number(i.quantity),
                  price: Number(i.price),
                })),
              });
            }
          } catch (e) {
            console.warn('[MP Webhook] No se pudo enviar la confirmación:', e);
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
      } else if (orderId && (status === 'rejected' || status === 'cancelled' || status === 'refunded')) {
        // Toma la orden en exclusiva antes de deshacer nada. MercadoPago
        // reenvía la misma notificación, y sin este filtro dentro del UPDATE
        // cada reintento devolvía el stock **otra vez** —inflando el
        // inventario—, regalaba de nuevo los puntos redimidos y mandaba un
        // segundo correo de cancelación.
        const { data: tomadas, error: errorTomar } = await supabaseServer
          .from('orders')
          .update({
            payment_status: status,
            status: status === 'refunded' ? 'refunded' : 'cancelled',
            updated_at: new Date().toISOString(),
          })
          .eq('id', orderId)
          .not('payment_status', 'in', '("rejected","cancelled","refunded")')
          .select('id');

        if (errorTomar) {
          console.error(`[MP Webhook] Error marcando la orden ${orderId}:`, errorTomar);
          return NextResponse.json({ received: true, flagged: 'update_failed' }, { status: 200 });
        }
        if (!tomadas || tomadas.length === 0) {
          console.log(`[MP Webhook] La orden ${orderId} ya estaba cancelada; no se deshace dos veces.`);
          return NextResponse.json({ received: true, flagged: 'ya_cancelada' }, { status: 200 });
        }

        console.log(`[MP Webhook] 🔄 Restaurando stock para orden ${orderId} debido a estado: ${status}`);

        // Devolver al inventario lo que la orden tenía reservado.
        // La traducción de `order_items.product_id` (que guarda `products.id`)
        // al código de barras que usan las RPC vive en el servicio de
        // inventario; acá sólo se informa el resultado.
        const devolucion = await restoreOrderStock(orderId, {
          reason: `MP_${status.toUpperCase()}`,
        });

        // 2b. Revertir puntos redimidos y notificar cancelación al cliente
        try {
          const { data: orderData } = await supabaseServer
            .from('orders')
            .select('shipping_address')
            .eq('id', orderId)
            .maybeSingle();

          if (orderData?.shipping_address) {
            const addr = typeof orderData.shipping_address === 'string'
              ? JSON.parse(orderData.shipping_address)
              : orderData.shipping_address;

            const customerEmail = addr.email;
            const pointsRedeemed = Number(addr.pointsRedeemed) || 0;

            if (customerEmail && pointsRedeemed > 0) {
              await addBonusPoints({
                customerEmail,
                points: pointsRedeemed,
                description: `Reverso de ${pointsRedeemed} puntos por orden #${orderId} cancelada`,
                referenceType: 'order_cancellation',
              });
              console.log(`[MP Webhook] 🌟 Se revirtieron ${pointsRedeemed} puntos a ${customerEmail}`);
            }

            if (customerEmail) {
              await sendOrderCancelledEmail({
                to: customerEmail,
                customerName: addr.fullName || 'Cliente',
                orderId,
                cancelReason: status === 'refunded' ? 'Pago reembolsado en Mercado Pago' : 'Pago no completado o rechazado en Mercado Pago',
                pointsRefunded: pointsRedeemed > 0 ? pointsRedeemed : undefined,
                paymentRefunded: status === 'refunded',
              });
            }
          }
        } catch (postCancelErr) {
          console.warn('[MP Webhook] Error en post-procesamiento de cancelación (puntos/email):', postCancelErr);
        }

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
