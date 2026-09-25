import { NextRequest, NextResponse } from "next/server";
import { requireApiAdmin } from "@/lib/api-auth";
import { esquemaEmision } from "@/lib/documentos/esquemas";
import { emitirDocumento, type SolicitudEmision } from "@/server/documentos.service";
import { proveedorDte } from "@/server/dte";
import { actorDe, responderError, responderValidacion } from "../_lib/respuesta";

/** GET: ¿hay proveedor de facturación conectado? */
export async function GET() {
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.response;
  const proveedor = proveedorDte();
  return NextResponse.json({ proveedor: proveedor?.nombre ?? null });
}

/** POST: prepara (y si hay proveedor, emite) una boleta, factura o nota. */
export async function POST(req: NextRequest) {
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.response;
  try {
    const parsed = esquemaEmision.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return responderValidacion(parsed.error);
    const resultado = await emitirDocumento(parsed.data as SolicitudEmision, actorDe(auth.session));
    return NextResponse.json(resultado, { status: 201 });
  } catch (e) {
    return responderError(e, "emitir");
  }
}
