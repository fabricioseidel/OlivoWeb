import { supabaseServer } from '@/lib/supabase-server';
import { auditLog } from '@/server/audit.service';
import { restoreOrderStock } from '@/server/inventory.service';
import { releaseCouponUsage } from '@/server/coupon.service';
import { addBonusPoints } from '@/server/loyalty.service';
import { sendOrderCancelledEmail } from '@/server/email.service';

export type CancelacionPedido = {
  /** Estado que queda en `payment_status`. */
  estadoPago: 'cancelled' | 'refunded';
  /** Quién cancela, para la auditoría. */
  actor: string;
  /** Motivo que se le muestra al cliente en el correo. */
  motivo: string;
  /** Detalles extra para la auditoría (id de pago, etc.). */
  detalles?: Record<string, unknown>;
};

export type ResultadoCancelacion =
  | { ok: true; cancelada: true }
  | { ok: true; cancelada: false; razon: 'ya_cancelada' }
  | { ok: false; error: string };

/**
 * Cancela un pedido y deshace todo lo que reservó al crearse: stock, cupón y
 * puntos canjeados. Avisa al cliente por correo.
 *
 * La usan el webhook de MercadoPago y el cron de pedidos abandonados; antes
 * vivía sólo en el webhook, y un segundo camino escrito aparte habría
 * terminado olvidando alguno de los pasos.
 *
 * Idempotente: toma el pedido en exclusiva con un UPDATE filtrado, así que si
 * dos avisos llegan a la vez sólo uno deshace. Sin eso, cada reenvío de
 * MercadoPago devolvía el stock **otra vez** e inflaba el inventario.
 */
export async function cancelarPedido(
  orderId: string,
  opts: CancelacionPedido
): Promise<ResultadoCancelacion> {
  const reembolso = opts.estadoPago === 'refunded';

  // El filtro va sobre `status` y no sobre `payment_status`: un pedido con un
  // intento rechazado sigue vivo y tiene que poder cancelarse.
  let tomar = supabaseServer
    .from('orders')
    .update({
      payment_status: opts.estadoPago,
      status: reembolso ? 'refunded' : 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)
    .not('status', 'in', '("cancelled","refunded")');
  // Sólo un reembolso deshace un pedido pagado. Una cancelación que llega
  // tarde —de un intento viejo, o del cron justo cuando entra el pago— no.
  if (!reembolso) tomar = tomar.neq('payment_status', 'paid');

  const { data: tomadas, error: errorTomar } = await tomar.select('id, shipping_address');

  if (errorTomar) return { ok: false, error: errorTomar.message };
  if (!tomadas || tomadas.length === 0) {
    return { ok: true, cancelada: false, razon: 'ya_cancelada' };
  }

  // 1. Devolver al inventario lo que el pedido tenía reservado. La traducción
  //    de `order_items.product_id` al código de barras vive en el servicio de
  //    inventario; acá sólo se informa el resultado.
  const devolucion = await restoreOrderStock(orderId, {
    reason: opts.estadoPago.toUpperCase(),
  });

  // 2. Devolver el cupón: el uso se registra al crear el pedido, y un pedido
  //    que no se pagó no debería gastar el de primera compra.
  try {
    await releaseCouponUsage(orderId);
  } catch (e) {
    console.warn(`[CancelarPedido] No se pudo liberar el cupón de la orden ${orderId}:`, e);
  }

  // 3. Revertir puntos canjeados y avisar al cliente.
  try {
    const raw = tomadas[0].shipping_address;
    const addr = (typeof raw === 'string' ? JSON.parse(raw) : raw) as Record<string, any> | null;
    const customerEmail = addr?.email;
    const pointsRedeemed = Number(addr?.pointsRedeemed) || 0;

    if (customerEmail && pointsRedeemed > 0) {
      await addBonusPoints({
        customerEmail,
        points: pointsRedeemed,
        description: `Reverso de ${pointsRedeemed} puntos por orden #${orderId} cancelada`,
        referenceType: 'order_cancellation',
      });
    }

    if (customerEmail) {
      await sendOrderCancelledEmail({
        to: customerEmail,
        customerName: addr?.fullName || 'Cliente',
        orderId,
        cancelReason: opts.motivo,
        pointsRefunded: pointsRedeemed > 0 ? pointsRedeemed : undefined,
        paymentRefunded: reembolso,
      });
    }
  } catch (e) {
    console.warn('[CancelarPedido] Error en post-procesamiento (puntos/email):', e);
  }

  // 4. Informar lo que pasó de verdad: el stock puede no haberse devuelto
  //    entero, y decir "restaurado" siempre escondía justamente ese caso.
  const quedoPendiente =
    !devolucion.ok || devolucion.fallidos > 0 || devolucion.sinResolver.length > 0;
  if (quedoPendiente) {
    console.error(
      `[CancelarPedido] ⚠️ Orden ${orderId} cancelada (${opts.estadoPago}), pero el stock NO se devolvió por completo:`,
      devolucion.ok
        ? { devueltos: devolucion.devueltos, fallidos: devolucion.fallidos, sinResolver: devolucion.sinResolver }
        : { error: devolucion.error }
    );
  }

  await auditLog({
    action: 'ORDER_PAYMENT_FAILED',
    entity: 'orders',
    entityId: orderId,
    actor: opts.actor,
    details: {
      ...opts.detalles,
      estadoPago: opts.estadoPago,
      stock: devolucion.ok
        ? {
            devueltos: devolucion.devueltos,
            fallidos: devolucion.fallidos,
            sinResolver: devolucion.sinResolver,
          }
        : { error: devolucion.error },
    },
  });

  return { ok: true, cancelada: true };
}
