import { NextRequest, NextResponse } from "next/server";
import { requireApiAdmin } from "@/lib/api-auth";
import { errorResponse } from "@/lib/api-response";
import { listarCierres, obtenerResumen, corregirCierre } from "@/server/cierre.service";
import type { CierrePayload } from "@/lib/cierre/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/cierres?shiftId=  → un cierre completo
 * GET /api/admin/cierres?desde=&hasta=&branchId=  → los del período
 */
export async function GET(req: NextRequest) {
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.response;

  try {
    const params = new URL(req.url).searchParams;
    const shiftId = params.get("shiftId");

    if (shiftId) {
      const resumen = await obtenerResumen(shiftId);
      if (!resumen) return NextResponse.json({ error: "Cierre no encontrado" }, { status: 404 });
      return NextResponse.json({ resumen });
    }

    const cierres = await listarCierres({
      branchId: params.get("branchId"),
      desde: params.get("desde") ?? undefined,
      hasta: params.get("hasta") ?? undefined,
    });
    return NextResponse.json({ cierres });
  } catch (e) {
    return errorResponse(e);
  }
}

/** POST /api/admin/cierres — reenvía un cierre corregido. Body: { shiftId, payload } */
export async function POST(req: Request) {
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.response;

  try {
    const body = (await req.json()) as { shiftId?: string; payload?: CierrePayload };
    if (!body.shiftId || !body.payload) {
      return NextResponse.json({ error: "Faltan shiftId o el detalle" }, { status: 400 });
    }
    const resumen = await corregirCierre(body.shiftId, body.payload);
    return NextResponse.json({ ok: true, resumen });
  } catch (e) {
    return errorResponse(e);
  }
}
