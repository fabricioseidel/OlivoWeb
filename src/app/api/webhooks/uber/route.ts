import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseServer } from "@/lib/supabase-server";
import { auditLog } from "@/server/audit.service";

/**
 * Webhook de Uber Direct: avisa cómo avanza cada envío.
 *
 * Ojo al registrar la URL en el panel de Uber: tiene que ser
 * https://www.olivomarket.cl/api/webhooks/uber, con `www`. El dominio raíz
 * responde 307 hacia www y los webhooks no siguen redirecciones — es
 * exactamente lo que hizo que los eventos de Resend no llegaran nunca.
 */

/** Estados terminales: una vez acá, no se pisan con eventos que lleguen tarde. */
const ESTADOS_TERMINALES = ["delivered", "canceled", "returned"];

/**
 * Verifica la firma HMAC-SHA256 del cuerpo crudo.
 *
 * Sin secret configurado se rechaza en producción: un webhook sin firma
 * verificada es un endpoint público que cualquiera puede usar para marcar
 * pedidos como entregados.
 */
function firmaValida(rawBody: string, firmaRecibida: string | null): boolean {
  const secret = process.env.UBER_DIRECT_WEBHOOK_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[Uber Webhook] ⚠️ Sin secret en desarrollo — firma NO verificada");
      return true;
    }
    console.error("[Uber Webhook] ❌ UBER_DIRECT_WEBHOOK_SECRET ausente en producción");
    return false;
  }

  if (!firmaRecibida) return false;

  const esperada = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const esperadaBuf = Buffer.from(esperada);
  const recibidaBuf = Buffer.from(firmaRecibida);

  return (
    esperadaBuf.length === recibidaBuf.length && crypto.timingSafeEqual(esperadaBuf, recibidaBuf)
  );
}

export async function POST(request: NextRequest) {
  try {
    // El cuerpo crudo, sin parsear: la firma se calcula sobre los bytes
    // exactos que llegaron, y volver a serializar el JSON los cambia.
    const rawBody = await request.text();
    const firma =
      request.headers.get("x-postmates-signature") ?? request.headers.get("x-uber-signature");

    if (!firmaValida(rawBody, firma)) {
      console.error("[Uber Webhook] ❌ Firma inválida — evento rechazado");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(rawBody);
    const deliveryId: string | undefined = event?.delivery_id ?? event?.data?.id;
    const status: string | undefined = event?.status ?? event?.data?.status;

    if (!deliveryId || !status) {
      // Evento que no trae lo que necesitamos (p.ej. `courier.update` de
      // posición). Se acepta para que Uber no reintente.
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const { data: order } = await supabaseServer
      .from("orders")
      .select("id, express_status")
      .eq("express_delivery_id", deliveryId)
      .maybeSingle();

    if (!order) {
      console.warn(`[Uber Webhook] Envío ${deliveryId} sin orden asociada`);
      return NextResponse.json({ received: true }, { status: 200 });
    }

    // Los eventos pueden llegar desordenados. Si el envío ya terminó, un
    // evento anterior no debe revivirlo.
    if (order.express_status && ESTADOS_TERMINALES.includes(order.express_status)) {
      return NextResponse.json({ received: true, ignored: "terminal_state" }, { status: 200 });
    }

    const update: Record<string, unknown> = {
      express_status: status,
      updated_at: new Date().toISOString(),
    };

    // Entregado cierra el pedido. Cancelado no: el cliente ya pagó y el
    // pedido sigue existiendo — queda para que operaciones lo despache por su
    // cuenta y el cargo lo asume la tienda.
    if (status === "delivered") update.status = "delivered";

    await supabaseServer.from("orders").update(update).eq("id", order.id);

    if (status === "canceled" || status === "returned") {
      await auditLog({
        action: "EXPRESS_DELIVERY_CANCELED",
        entity: "orders",
        entityId: String(order.id),
        actor: "uber-webhook",
        details: { deliveryId, status },
      });
      console.warn(
        `[Uber Webhook] Envío ${deliveryId} terminó en "${status}" — la orden ${order.id} necesita despacho manual`
      );
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("[Uber Webhook] Error procesando evento:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
