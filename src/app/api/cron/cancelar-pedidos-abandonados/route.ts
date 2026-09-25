import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { PLAZO_PEDIDO_ABANDONADO_MS } from "@/lib/pedido-plazos";
import { cancelarPedido } from "@/server/order-cancel.service";

/**
 * Cron: cancela los pedidos de MercadoPago que nadie terminó de pagar.
 *
 * Un pedido reserva stock, cupón y puntos al crearse, antes de cobrar. Si el
 * cliente abandona el pago —o se le rechaza y no reintenta— esa reserva
 * quedaba tomada para siempre: productos que figuran vendidos sin estarlo y un
 * cupón de primera compra que el cliente ya no puede usar.
 *
 * Se mide desde `updated_at` y no desde la creación: pedir un link nuevo o un
 * intento rechazado lo tocan, así que un cliente que sigue intentando no pierde
 * el pedido. Los links vencen antes de este plazo (ver `pedido-plazos`), por lo
 * que al cancelar ya no queda ninguno con el que pagar.
 *
 * Se autentica con `Authorization: Bearer ${CRON_SECRET}`, como el resto de
 * los cron; sin el secreto configurado queda cerrado.
 */
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const limite = new Date(Date.now() - PLAZO_PEDIDO_ABANDONADO_MS).toISOString();

    const { data: abandonados, error } = await supabaseServer
      .from("orders")
      .select("id")
      .eq("payment_method", "mercadopago")
      .eq("status", "pending")
      .neq("payment_status", "paid")
      .or(`updated_at.lt.${limite},and(updated_at.is.null,created_at.lt.${limite})`)
      .limit(200);

    if (error) throw error;
    if (!abandonados?.length) {
      return NextResponse.json({ cancelados: 0, message: "No hay pedidos abandonados" });
    }

    // Uno por uno y no en paralelo: cada cancelación devuelve stock con RPC y
    // manda un correo, y en lote se pisarían los límites de ambos.
    const resultados: Array<{ orderId: string; ok: boolean; cancelado?: boolean; error?: string }> = [];
    for (const { id } of abandonados) {
      const r = await cancelarPedido(String(id), {
        estadoPago: "cancelled",
        actor: "cron-pedidos-abandonados",
        motivo: "El pago no se completó a tiempo y el pedido se liberó",
      });
      resultados.push(
        r.ok
          ? { orderId: String(id), ok: true, cancelado: r.cancelada }
          : { orderId: String(id), ok: false, error: r.error }
      );
    }

    return NextResponse.json({
      cancelados: resultados.filter((r) => r.ok && r.cancelado).length,
      fallidos: resultados.filter((r) => !r.ok).length,
      resultados,
    });
  } catch (error: any) {
    console.error("cancelar-pedidos-abandonados cron error:", error);
    return NextResponse.json({ error: error?.message ?? "Error" }, { status: 500 });
  }
}
