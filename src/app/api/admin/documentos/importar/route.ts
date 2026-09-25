import { NextRequest, NextResponse } from "next/server";
import { requireApiAdmin } from "@/lib/api-auth";
import { esquemaImportacion } from "@/lib/documentos/esquemas";
import { importarRcv } from "@/server/documentos.service";
import { actorDe, responderError, responderValidacion } from "../_lib/respuesta";

/**
 * POST { contenido, direccion, confirmar }
 * Importa el CSV del Registro de Compras y Ventas del SII. Con
 * `confirmar: false` sólo muestra qué entraría, sin guardar nada.
 */
export async function POST(req: NextRequest) {
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.response;
  try {
    const parsed = esquemaImportacion.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return responderValidacion(parsed.error);
    const resultado = await importarRcv({ ...parsed.data, actor: actorDe(auth.session) });
    return NextResponse.json(resultado);
  } catch (e) {
    return responderError(e, "importar");
  }
}
