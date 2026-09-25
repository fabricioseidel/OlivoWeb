import { NextRequest, NextResponse } from "next/server";
import { requireApiAdmin } from "@/lib/api-auth";
import { adjuntarArchivoDocumento, obtenerDocumento, urlFirmada } from "@/server/documentos.service";
import { actorDe, responderError } from "../../_lib/respuesta";

type Ctx = { params: Promise<{ id: string }> };

/** GET: abre el archivo del documento (redirige a una URL firmada de 5 minutos). */
export async function GET(_req: NextRequest, { params }: Ctx) {
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.response;
  try {
    const documento = await obtenerDocumento((await params).id);
    if (!documento?.archivo_path) return NextResponse.json({ error: "Este documento no tiene archivo" }, { status: 404 });
    return NextResponse.redirect(await urlFirmada(documento.archivo_path));
  } catch (e) {
    return responderError(e, "archivo.ver");
  }
}

/** POST multipart con `file`: foto o PDF del documento. */
export async function POST(req: NextRequest, { params }: Ctx) {
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.response;
  try {
    const form = await req.formData();
    const archivo = form.get("file");
    if (!(archivo instanceof File)) return NextResponse.json({ error: "Falta el archivo" }, { status: 400 });
    const documento = await adjuntarArchivoDocumento((await params).id, archivo, actorDe(auth.session));
    return NextResponse.json({ documento });
  } catch (e) {
    return responderError(e, "archivo.subir");
  }
}
