import { NextRequest, NextResponse } from "next/server";
import { requireApiAdmin } from "@/lib/api-auth";
import { esquemaCambiosDocumento } from "@/lib/documentos/esquemas";
import { actualizarDocumento, eliminarDocumento, obtenerDocumento } from "@/server/documentos.service";
import { actorDe, responderError, responderValidacion } from "../_lib/respuesta";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.response;
  try {
    const documento = await obtenerDocumento((await params).id);
    if (!documento) return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
    return NextResponse.json({ documento });
  } catch (e) {
    return responderError(e, "obtener");
  }
}

/** PATCH: revisar (aceptar/reclamar), marcar pagado, anotar el folio de un borrador, corregir datos. */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.response;
  try {
    const parsed = esquemaCambiosDocumento.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return responderValidacion(parsed.error);
    const documento = await actualizarDocumento((await params).id, parsed.data, actorDe(auth.session));
    return NextResponse.json({ documento });
  } catch (e) {
    return responderError(e, "actualizar");
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.response;
  try {
    await eliminarDocumento((await params).id, actorDe(auth.session));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return responderError(e, "eliminar");
  }
}
