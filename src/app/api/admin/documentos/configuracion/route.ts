import { NextRequest, NextResponse } from "next/server";
import { requireApiAdmin } from "@/lib/api-auth";
import { esquemaConfiguracion } from "@/lib/documentos/esquemas";
import { guardarConfiguracion, obtenerConfiguracion } from "@/server/documentos.service";
import { actorDe, responderError, responderValidacion } from "../_lib/respuesta";

export async function GET() {
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.response;
  try {
    return NextResponse.json(await obtenerConfiguracion());
  } catch (e) {
    return responderError(e, "configuracion");
  }
}

export async function PUT(req: NextRequest) {
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.response;
  try {
    const parsed = esquemaConfiguracion.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return responderValidacion(parsed.error);
    return NextResponse.json(await guardarConfiguracion(parsed.data, actorDe(auth.session)));
  } catch (e) {
    return responderError(e, "configuracion.guardar");
  }
}
