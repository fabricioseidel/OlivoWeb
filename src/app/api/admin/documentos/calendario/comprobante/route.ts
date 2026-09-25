import { NextRequest, NextResponse } from "next/server";
import { requireApiAdmin } from "@/lib/api-auth";
import { esPeriodo } from "@/lib/documentos/vencimientos";
import { obtenerObligacion, urlFirmada } from "@/server/documentos.service";
import type { TipoObligacion } from "@/lib/documentos/vencimientos";
import { responderError } from "../../_lib/respuesta";

const TIPOS: TipoObligacion[] = ["F29", "PREVIRED", "PATENTE", "F22"];

/** GET ?tipo=F29&periodo=YYYY-MM — abre el comprobante de pago. */
export async function GET(req: NextRequest) {
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.response;
  try {
    const tipo = req.nextUrl.searchParams.get("tipo") as TipoObligacion;
    const periodo = req.nextUrl.searchParams.get("periodo");
    if (!TIPOS.includes(tipo) || !esPeriodo(periodo)) {
      return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
    }
    const obligacion = await obtenerObligacion(tipo, periodo);
    if (!obligacion?.comprobante_path) return NextResponse.json({ error: "Sin comprobante" }, { status: 404 });
    return NextResponse.redirect(await urlFirmada(obligacion.comprobante_path));
  } catch (e) {
    return responderError(e, "comprobante");
  }
}
