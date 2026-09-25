import { NextRequest, NextResponse } from "next/server";
import { requireApiAdmin } from "@/lib/api-auth";
import { esquemaDocumentoNuevo } from "@/lib/documentos/esquemas";
import { esPeriodo } from "@/lib/documentos/vencimientos";
import { crearDocumento, listarDocumentos, type NuevoDocumento } from "@/server/documentos.service";
import { actorDe, responderError, responderValidacion } from "./_lib/respuesta";

/**
 * GET /api/admin/documentos?periodo=YYYY-MM&direccion=recibido&estado=pendiente
 * POST /api/admin/documentos — registra un documento (recibido o emitido fuera del panel).
 */
export async function GET(req: NextRequest) {
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.response;
  try {
    const sp = req.nextUrl.searchParams;
    const periodo = sp.get("periodo");
    const direccion = sp.get("direccion");
    const documentos = await listarDocumentos({
      periodo: esPeriodo(periodo) ? periodo : undefined,
      direccion: direccion === "emitido" || direccion === "recibido" ? direccion : undefined,
      estado: sp.get("estado") || undefined,
      supplierId: sp.get("supplierId") || undefined,
    });
    return NextResponse.json({ documentos });
  } catch (e) {
    return responderError(e, "listar");
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.response;
  try {
    const parsed = esquemaDocumentoNuevo.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return responderValidacion(parsed.error);
    const documento = await crearDocumento(parsed.data as NuevoDocumento, actorDe(auth.session));
    return NextResponse.json({ documento }, { status: 201 });
  } catch (e) {
    return responderError(e, "crear");
  }
}
