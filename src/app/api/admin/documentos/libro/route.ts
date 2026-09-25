import { NextRequest, NextResponse } from "next/server";
import { requireApiAdmin } from "@/lib/api-auth";
import { esquemaPeriodo } from "@/lib/documentos/esquemas";
import { esPeriodo, hoyEnChile, periodoDeFecha } from "@/lib/documentos/vencimientos";
import { cerrarPeriodo, guardarPeriodo, libroMensual, reabrirPeriodo } from "@/server/documentos.service";
import { actorDe, responderError, responderValidacion } from "../_lib/respuesta";

/** GET ?periodo=YYYY-MM — libro del mes con el F29 estimado. */
export async function GET(req: NextRequest) {
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.response;
  try {
    const p = req.nextUrl.searchParams.get("periodo");
    const periodo = esPeriodo(p) ? p : periodoDeFecha(hoyEnChile());
    return NextResponse.json(await libroMensual(periodo));
  } catch (e) {
    return responderError(e, "libro");
  }
}

/** POST { periodo, accion: guardar | cerrar | reabrir, ... } */
export async function POST(req: NextRequest) {
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.response;
  try {
    const parsed = esquemaPeriodo.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return responderValidacion(parsed.error);
    const { periodo, accion, ...cambios } = parsed.data;
    const actor = actorDe(auth.session);
    if (accion === "cerrar") await cerrarPeriodo(periodo, actor);
    else if (accion === "reabrir") await reabrirPeriodo(periodo, actor);
    else await guardarPeriodo(periodo, cambios, actor);
    return NextResponse.json(await libroMensual(periodo));
  } catch (e) {
    return responderError(e, "libro.guardar");
  }
}
