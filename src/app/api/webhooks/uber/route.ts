/**
 * Avisos de Uber Direct sobre el estado de una entrega.
 *
 * Sin esto la tienda sabía que la entrega se había creado y nada más: ni cuándo
 * pasó el repartidor, ni cuándo llegó. El estado del pedido había que moverlo a
 * mano adivinando, y el cliente no se enteraba de nada.
 *
 * Uber pega acá cada vez que la entrega cambia de estado. La URL se configura
 * en el panel de Uber Direct (Webhooks → Delivery status) apuntando a
 * `https://<dominio>/api/webhooks/uber`, con el secreto en
 * `UBER_DIRECT_WEBHOOK_SECRET`.
 *
 * Responde 200 salvo que la firma no cuadre: un 500 hace que Uber reintente, y
 * reintentar un aviso que ya se procesó no arregla nada.
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseServer } from '@/lib/supabase-server';
import { auditLog } from '@/server/audit.service';
import { sendOrderStatusEmail } from '@/server/email.service';
import { leerEstadoUber, esAvance } from '@/lib/uber-status';

/**
 * Valida la firma del aviso.
 *
 * Uber firma el cuerpo crudo con HMAC-SHA256 y lo manda en hexadecimal. El
 * header cambió de nombre con el rebranding de Postmates, así que se aceptan
 * los dos: las cuentas viejas siguen mandando el antiguo.
 */
function firmaValida(request: NextRequest, cuerpoCrudo: string): boolean {
  const secret = process.env.UBER_DIRECT_WEBHOOK_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[Uber Webhook] ⚠️ Sin secret en desarrollo — firma NO verificada');
      return true;
    }
    // En producción, sin secret no se procesa nada: fail-closed, igual que MercadoPago.
    console.error('[Uber Webhook] ❌ UBER_DIRECT_WEBHOOK_SECRET ausente — aviso rechazado');
    return false;
  }

  const recibida =
    request.headers.get('x-postmates-signature') || request.headers.get('x-uber-signature');
  if (!recibida) return false;

  const esperada = crypto.createHmac('sha256', secret).update(cuerpoCrudo).digest('hex');
  const bufEsperada = Buffer.from(esperada);
  const bufRecibida = Buffer.from(recibida.trim());
  return (
    bufEsperada.length === bufRecibida.length && crypto.timingSafeEqual(bufEsperada, bufRecibida)
  );
}

export async function POST(request: NextRequest) {
  // El cuerpo se lee crudo porque la firma se calcula sobre los bytes exactos:
  // volver a serializar el JSON cambia espacios y la firma deja de cuadrar.
  const cuerpoCrudo = await request.text();

  if (!firmaValida(request, cuerpoCrudo)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let evento: Record<string, any>;
  try {
    evento = JSON.parse(cuerpoCrudo);
  } catch {
    console.error('[Uber Webhook] ❌ Cuerpo que no es JSON');
    return NextResponse.json({ received: true, ignored: 'cuerpo-invalido' });
  }

  try {
    // Uber manda varios tipos de aviso. `event.courier_update` es la posición
    // del repartidor cada pocos segundos: eso lo muestra el link de seguimiento
    // y no hace falta guardarlo.
    const kind = String(evento.kind || '');
    if (kind && kind !== 'event.delivery_status') {
      return NextResponse.json({ received: true, ignored: kind });
    }

    const deliveryId = String(evento.delivery_id || evento.data?.id || evento.id || '');
    const estadoCrudo = evento.status ?? evento.data?.status;
    if (!deliveryId) {
      return NextResponse.json({ received: true, ignored: 'sin-delivery-id' });
    }

    const { data: order } = await supabaseServer
      .from('orders')
      .select('id, status, express_status, express_tracking_url, shipping_method, shipping_address')
      .eq('express_delivery_id', deliveryId)
      .maybeSingle();

    if (!order) {
      // Puede ser una entrega de otro entorno (sandbox pegándole a producción).
      console.warn(`[Uber Webhook] Entrega ${deliveryId} sin orden asociada`);
      return NextResponse.json({ received: true, ignored: 'orden-no-encontrada' });
    }

    const lectura = leerEstadoUber(estadoCrudo);

    // Los avisos llegan desordenados y repetidos. Sin esto un `pickup` rezagado
    // podría desentregar un pedido ya entregado.
    if (!esAvance(order.express_status, estadoCrudo)) {
      return NextResponse.json({ received: true, ignored: 'estado-no-avanza' });
    }

    const cambios: Record<string, unknown> = {
      express_status: lectura.estado === 'unknown' ? String(estadoCrudo ?? '') : lectura.estado,
      updated_at: new Date().toISOString(),
    };
    // Uber puede mandar el link recién en el primer aviso, si al crear la
    // entrega todavía no lo tenía.
    const trackingNuevo = evento.data?.tracking_url || evento.tracking_url;
    if (trackingNuevo && !order.express_tracking_url) cambios.express_tracking_url = trackingNuevo;
    if (lectura.estadoPedido) cambios.status = lectura.estadoPedido;

    const { error } = await supabaseServer.from('orders').update(cambios).eq('id', order.id);
    if (error) {
      console.error(`[Uber Webhook] Error guardando el estado de ${order.id}:`, error);
      return NextResponse.json({ received: true, ignored: 'error-guardando' });
    }

    console.log(`[Uber Webhook] 🛵 Orden ${order.id}: ${lectura.etiqueta}`);
    await auditLog({
      action: lectura.necesitaAtencion ? 'UBER_DELIVERY_FAILED' : 'UBER_DELIVERY_STATUS',
      entity: 'orders',
      entityId: order.id,
      actor: 'uber-webhook',
      details: { deliveryId, estado: lectura.estado, etiqueta: lectura.etiqueta },
    });

    // El aviso al cliente sale sólo cuando el pedido cambia de etapa de verdad:
    // "buscando repartidor" no es un correo que nadie quiera recibir.
    if (lectura.estadoPedido && lectura.estadoPedido !== order.status) {
      await avisarAlCliente(order, lectura.estadoPedido, trackingNuevo || order.express_tracking_url);
    }

    return NextResponse.json({ received: true, estado: lectura.estado });
  } catch (e) {
    // Nunca 500: Uber reintentaría y el reintento no arregla un bug nuestro.
    console.error('[Uber Webhook] ❌ Error procesando el aviso:', e);
    return NextResponse.json({ received: true, error: 'internal' });
  }
}

/** Manda el correo de la etapa nueva. Nunca lanza: el aviso ya quedó guardado. */
async function avisarAlCliente(
  order: { id: string; shipping_address?: unknown; shipping_method?: string | null },
  estadoPedido: 'shipped' | 'delivered',
  trackingUrl?: string | null
): Promise<void> {
  try {
    const dir = (
      typeof order.shipping_address === 'string'
        ? JSON.parse(order.shipping_address)
        : (order.shipping_address ?? {})
    ) as Record<string, any>;

    if (!dir.email) return;

    // Mismo interruptor que usa el panel: si la tienda apagó el aviso de
    // despacho, el webhook tampoco lo manda.
    if (estadoPedido === 'shipped') {
      const { data: settings } = await supabaseServer
        .from('settings')
        .select('shipping_confirmation_enabled')
        .maybeSingle();
      if (settings?.shipping_confirmation_enabled === false) return;
    }

    await sendOrderStatusEmail({
      to: dir.email,
      customerName: dir.fullName || 'Cliente',
      orderId: order.id,
      status: estadoPedido,
      address:
        dir.formattedAddress ||
        (dir.address ? `${dir.address}${dir.city ? `, ${dir.city}` : ''}` : 'Dirección registrada'),
      shippingMethod: order.shipping_method === 'flash' ? 'Envío flash' : undefined,
      trackingUrl: trackingUrl || undefined,
    });
  } catch (e) {
    console.warn('[Uber Webhook] No se pudo enviar el correo de estado:', e);
  }
}
