import { NextResponse } from "next/server";
import { requireApiAdminOrSeller } from "@/lib/api-auth";
import {
  marcarEnviado,
  confirmarDisponibilidad,
  registrarRecepcion,
  CANALES,
  type Canal,
} from "@/server/purchase-cycle.service";

export const dynamic = "force-dynamic";

/**
 * Los tres pasos del ciclo de compra que la ruta PATCH del pedido no cubría.
 *
 * Viven juntos en una ruta propia porque comparten el pedido y el orden en que
 * ocurren: se manda, el proveedor confirma qué tiene, y después llega. Meterlos
 * en el PATCH general habría convertido esa ruta en un despachador de acciones
 * con un `if` por cada una.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAdminOrSeller();
  if (!auth.ok) return auth.response;

  const { id } = await params;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  switch (body?.accion) {
    case "enviar": {
      const canal = body.canal as Canal;
      if (!CANALES.includes(canal)) {
        return NextResponse.json(
          { error: `Canal desconocido: ${String(body.canal)}` },
          { status: 400 }
        );
      }
      const r = await marcarEnviado(id, canal, auth.userId);
      return r.ok
        ? NextResponse.json({ ok: true, canal })
        : NextResponse.json({ error: r.error }, { status: 400 });
    }

    case "confirmar": {
      const r = await confirmarDisponibilidad(id, body.lineas ?? [], auth.userId);
      return r.ok
        ? NextResponse.json({ ok: true, actualizadas: r.actualizadas })
        : NextResponse.json({ error: r.error }, { status: 400 });
    }

    case "recibir": {
      const r = await registrarRecepcion(id, body.lineas ?? []);
      return r.ok
        ? NextResponse.json({ ok: true, variaciones: r.variaciones, unidades: r.unidades })
        : NextResponse.json({ error: r.error }, { status: 400 });
    }

    default:
      return NextResponse.json(
        { error: "Acción desconocida. Esperaba enviar, confirmar o recibir." },
        { status: 400 }
      );
  }
}
