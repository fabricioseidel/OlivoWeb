/**
 * Creación del envío inmediato con Uber Direct.
 *
 * Se dispara cuando el pago queda confirmado, nunca antes: pedir un repartidor
 * para una orden que todavía no se pagó significa pagarle a Uber por un pedido
 * que puede no existir.
 *
 * La cotización que se guardó al crear la orden ya venció para este momento
 * (duran pocos minutos), así que se cotiza de nuevo. Si la tarifa subió, la
 * diferencia la absorbe la tienda: al cliente ya se le cobró lo que vio.
 */

import { supabaseServer } from "@/lib/supabase-server";
import { auditLog } from "@/server/audit.service";
import {
  UberDirectError,
  cotizarEnvio,
  crearEnvio,
  direccionDestino,
  uberDirectConfigurado,
} from "@/lib/uber-direct/client";

export type ResultadoEnvio =
  | { ok: true; deliveryId: string; trackingUrl: string | null }
  | { ok: false; motivo: string };

/**
 * Pide el repartidor para una orden ya pagada.
 *
 * Es idempotente: si la orden ya tiene un envío creado no se pide otro. Los
 * webhooks de pago reintentan, y un doble llamado acá significaría dos
 * repartidores y dos cobros.
 */
export async function crearEnvioParaOrden(orderId: string): Promise<ResultadoEnvio> {
  if (!uberDirectConfigurado()) {
    return { ok: false, motivo: "Uber Direct no está configurado" };
  }

  const { data: order, error } = await supabaseServer
    .from("orders")
    .select("id, subtotal, shipping_method, shipping_address, express_delivery_id, express_fee")
    .eq("id", orderId)
    .maybeSingle();

  if (error || !order) {
    return { ok: false, motivo: "No se encontró la orden" };
  }
  if (order.shipping_method !== "express") {
    return { ok: false, motivo: "La orden no es de envío inmediato" };
  }
  if (order.express_delivery_id) {
    // Ya se pidió. No es un error: el webhook reintentó.
    return { ok: true, deliveryId: order.express_delivery_id, trackingUrl: null };
  }

  const info = (order.shipping_address ?? {}) as any;

  const { data: items } = await supabaseServer
    .from("order_items")
    .select("name, quantity, price")
    .eq("order_id", orderId);

  try {
    const destino = direccionDestino({
      address: info.address,
      city: info.city,
      state: info.state,
      zipCode: info.zipCode,
      apartment: info.apartment,
      tower: info.tower,
    });

    // Cotización fresca: la de create-order ya venció.
    const quote = await cotizarEnvio({
      destino,
      valorPedido: Number(order.subtotal) || 0,
    });

    const delivery = await crearEnvio({
      quoteId: quote.id,
      destino,
      clienteNombre: info.fullName || "Cliente",
      clienteTelefono: info.phone || "",
      items: (items ?? []).map((item) => ({
        name: item.name,
        quantity: item.quantity,
        price: Number(item.price) || undefined,
      })),
      referenciaExterna: String(orderId),
      notas: [info.tower && `Torre ${info.tower}`, info.apartment && `Depto ${info.apartment}`]
        .filter(Boolean)
        .join(", ") || undefined,
    });

    await supabaseServer
      .from("orders")
      .update({
        express_delivery_id: delivery.id,
        express_tracking_url: delivery.trackingUrl,
        express_status: delivery.status,
        // Tarifa real cobrada por Uber, que puede diferir de la cotizada al
        // momento del checkout. Lo que pagó el cliente no se toca.
        express_fee: delivery.fee || order.express_fee,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    await auditLog({
      action: "EXPRESS_DELIVERY_CREATED",
      entity: "orders",
      entityId: String(orderId),
      actor: "uber-direct",
      details: { deliveryId: delivery.id, fee: delivery.fee, quotedFee: quote.fee },
    });

    return { ok: true, deliveryId: delivery.id, trackingUrl: delivery.trackingUrl };
  } catch (err) {
    const motivo =
      err instanceof UberDirectError ? `${err.code ?? err.status}: ${err.message}` : String(err);

    // El pedido está pagado y no hay repartidor. Queda marcado para que
    // operaciones lo vea y lo despache por su cuenta — no se cancela ni se
    // devuelve la plata por decisión automática.
    await supabaseServer
      .from("orders")
      .update({ express_status: "failed", updated_at: new Date().toISOString() })
      .eq("id", orderId);

    await auditLog({
      action: "EXPRESS_DELIVERY_FAILED",
      entity: "orders",
      entityId: String(orderId),
      actor: "uber-direct",
      details: { motivo },
    });

    console.error(`[Uber Direct] No se pudo crear el envío de la orden ${orderId}:`, err);
    return { ok: false, motivo };
  }
}
