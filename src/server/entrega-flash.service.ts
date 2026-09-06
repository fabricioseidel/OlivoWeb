/**
 * Despacho de un pedido flash: pedirle el repartidor a Uber.
 *
 * Vivía dentro del webhook de MercadoPago, que es el único lugar donde se
 * disparaba. Eso dejaba un pedido pagado sin ninguna forma de recuperarse: si
 * Uber decía que no —tarjeta sin cupo, caída momentánea, cotización vencida—,
 * el pedido quedaba muerto y había que resolverlo fuera del sistema. Ahora
 * también lo usa el botón "Reintentar entrega" del panel.
 *
 * La regla 4 sigue en pie: **sólo con el pago confirmado**. Antes no, porque un
 * pago que después se rechaza dejaría un repartidor en camino a buscar un
 * pedido que nadie pagó, y esa entrega se cobra igual.
 */

import { supabaseServer } from '@/lib/supabase-server';
import { auditLog } from '@/server/audit.service';
import { cotizarFlash, crearEntregaFlash } from '@/server/uber-direct.service';

export type PedidoParaDespachar = {
  id: string;
  total?: number | string | null;
  shipping_cost?: number | string | null;
  shipping_address?: unknown;
  express_delivery_id?: string | null;
};

export type ResultadoDespacho =
  | { ok: true; deliveryId: string; tracking: string | null }
  | { ok: false; motivo: string; yaTenia?: boolean };

/** Marca provisional mientras se le pide la entrega a Uber. */
const EN_CURSO = 'creando';

/**
 * Toma el pedido en exclusiva para despacharlo.
 *
 * Es un UPDATE condicional y no un SELECT seguido de un UPDATE: MercadoPago
 * reenvía la misma notificación y dos invocaciones podían leer
 * `express_delivery_id` vacío a la vez y pedir **dos repartidores**, que se
 * cobran los dos. El índice único de la columna no lo impide, porque cada una
 * crea una entrega con id distinto. Con el filtro dentro del UPDATE, sólo una
 * se lleva la fila.
 */
async function tomarElPedido(orderId: string): Promise<boolean> {
  const { data, error } = await supabaseServer
    .from('orders')
    .update({ express_status: EN_CURSO, updated_at: new Date().toISOString() })
    .eq('id', orderId)
    .is('express_delivery_id', null)
    // `neq` solo dejaría fuera las filas con NULL, que son la mayoría.
    .or(`express_status.is.null,express_status.neq.${EN_CURSO}`)
    .select('id');

  if (error) {
    console.error(`[Flash] No se pudo tomar la orden ${orderId}:`, error);
    return false;
  }
  return (data?.length ?? 0) > 0;
}

/** Deja anotado el fallo en la orden, para que el panel lo muestre. */
async function marcarFallo(orderId: string, motivo: string): Promise<void> {
  await supabaseServer
    .from('orders')
    .update({
      express_status: 'failed',
      express_error: motivo.slice(0, 500),
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId);
}

/**
 * Pide el repartidor. Nunca lanza: el pago ya está confirmado y el pedido ya
 * quedó marcado, así que quien llame tiene que poder seguir.
 */
export async function despacharPedidoFlash(
  pedido: PedidoParaDespachar,
  actor: string
): Promise<ResultadoDespacho> {
  const orderId = pedido.id;
  const dir = (pedido.shipping_address ?? {}) as Record<string, any>;

  if (pedido.express_delivery_id || dir.uberDeliveryId) {
    return { ok: false, motivo: 'La orden ya tiene una entrega creada.', yaTenia: true };
  }

  if (!(await tomarElPedido(orderId))) {
    return {
      ok: false,
      motivo: 'Otra ejecución ya está creando la entrega de esta orden.',
      yaTenia: true,
    };
  }

  const destino = {
    calle: String(dir.address || ''),
    comuna: String(dir.city || ''),
    codigoPostal: dir.zipCode ? String(dir.zipCode) : undefined,
    lat: (dir.coords as { lat?: number })?.lat ?? null,
    lng: (dir.coords as { lng?: number })?.lng ?? null,
    telefono: dir.phone ? String(dir.phone) : null,
  };

  try {
    // La cotización guardada al crear el pedido caduca —Uber la da por unos
    // minutos— y entre el checkout y la confirmación del pago puede pasar de
    // todo. Si venció, o si nunca se guardó, se pide una nueva en vez de
    // dejar el pedido sin despachar: el cliente ya pagó.
    let quoteId = dir.uberQuoteId ? String(dir.uberQuoteId) : null;
    const vence = dir.uberQuoteExpira ? Date.parse(String(dir.uberQuoteExpira)) : NaN;
    // Sin fecha de vencimiento no se puede saber la edad de la cotización, y
    // una cotización vieja es rechazada por Uber igual que una vencida. Se
    // recotiza ante la duda: pedir una cotización es una llamada barata y no
    // compromete nada, mientras que reutilizar una muerta deja al pedido sin
    // despachar. Las órdenes creadas antes de que se guardara este dato caen
    // todas acá.
    const vencida = !Number.isFinite(vence) || vence <= Date.now();

    if (!quoteId || vencida) {
      const nueva = await cotizarFlash(destino);
      if (!nueva) {
        const motivo = 'Uber no está llegando a esa dirección en este momento.';
        await marcarFallo(orderId, motivo);
        await auditLog({
          action: 'UBER_DELIVERY_FAILED',
          entity: 'orders',
          entityId: orderId,
          actor,
          details: { motivo, recotizada: true },
        });
        return { ok: false, motivo };
      }
      quoteId = nueva.quoteId;
    }

    const entrega = await crearEntregaFlash({
      quoteId,
      destino,
      nombreCliente: String(dir.fullName || 'Cliente'),
      telefonoCliente: String(dir.phone || ''),
      referenciaPedido: String(orderId),
      // Valor declarado, para el seguro de Uber ante pérdida o daño.
      valorPedidoCLP: Number(pedido.total) || 0,
    });

    const { error: errorGuardado } = await supabaseServer
      .from('orders')
      .update({
        express_delivery_id: entrega.id,
        express_tracking_url: entrega.tracking,
        express_status: entrega.estado || 'pending',
        express_error: null,
        express_fee: entrega.feeCLP,
        // Lo que el cliente pagó por el envío. En $0 iba de regalo y la tarifa
        // de Uber la absorbe la tienda.
        express_fee_paid_by: Number(pedido.shipping_cost) > 0 ? 'customer' : 'store',
        shipping_address: { ...dir, uberDeliveryId: entrega.id, uberTracking: entrega.tracking },
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (errorGuardado) {
      // El repartidor ya está pedido y se cobra igual, pero la orden no quedó
      // marcada: sin `express_delivery_id` un reintento pediría un segundo
      // repartidor y el webhook de Uber no puede encontrar esta orden.
      console.error(
        `[Flash] Entrega ${entrega.id} creada pero NO guardada en la orden ${orderId}:`,
        errorGuardado
      );
      await auditLog({
        action: 'UBER_DELIVERY_FAILED',
        entity: 'orders',
        entityId: orderId,
        actor,
        details: {
          motivo: 'entrega-creada-sin-guardar',
          deliveryId: entrega.id,
          tracking: entrega.tracking,
          error: errorGuardado.message,
        },
      });
      return { ok: false, motivo: 'La entrega se creó en Uber pero no se pudo guardar.' };
    }

    console.log(`[Flash] 🛵 Entrega de Uber creada para la orden ${orderId}: ${entrega.id}`);
    await auditLog({
      action: 'UBER_DELIVERY_CREATED',
      entity: 'orders',
      entityId: orderId,
      actor,
      details: { deliveryId: entrega.id, quoteId, tracking: entrega.tracking },
    });
    return { ok: true, deliveryId: entrega.id, tracking: entrega.tracking };
  } catch (e) {
    const motivo = e instanceof Error ? e.message : String(e);
    console.error(`[Flash] ❌ No se pudo crear la entrega de la orden ${orderId}:`, motivo);
    await marcarFallo(orderId, motivo);
    await auditLog({
      action: 'UBER_DELIVERY_FAILED',
      entity: 'orders',
      entityId: orderId,
      actor,
      details: { motivo },
    });
    return { ok: false, motivo };
  }
}
