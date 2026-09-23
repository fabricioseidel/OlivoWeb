import { NextRequest, NextResponse } from "next/server";
import { requireApiAdmin } from "@/lib/api-auth";
import { errorResponse } from "@/lib/api-response";
import { listarCuentas, movimientosDeCuenta } from "@/server/cierre.service";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/cuentas              → todas las cuentas de fiado con su saldo
 * GET /api/admin/cuentas?id=xxx       → movimientos de una cuenta
 * GET /api/admin/cuentas?conDeuda=1   → sólo las que deben
 */
export async function GET(req: NextRequest) {
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.response;

  try {
    const params = new URL(req.url).searchParams;
    const id = params.get("id");

    if (id) {
      return NextResponse.json({ movimientos: await movimientosDeCuenta(id) });
    }

    const cuentas = await listarCuentas(params.get("conDeuda") === "1");
    return NextResponse.json({ cuentas });
  } catch (e) {
    return errorResponse(e);
  }
}
