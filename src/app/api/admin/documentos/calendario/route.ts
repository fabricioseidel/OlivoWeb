import { NextRequest, NextResponse } from "next/server";
import { requireApiAdmin } from "@/lib/api-auth";
import { esquemaPagoObligacion } from "@/lib/documentos/esquemas";
import { hoyEnChile, sumarDias } from "@/lib/documentos/vencimientos";
import { calendario, registrarPagoObligacion } from "@/server/documentos.service";
import { actorDe, responderError, responderValidacion } from "../_lib/respuesta";

const esFecha = (v: string | null): v is string => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);

/** GET ?desde=YYYY-MM-DD&hasta=YYYY-MM-DD — vencimientos con montos estimados y pagos. */
export async function GET(req: NextRequest) {
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.response;
  try {
    const hoy = hoyEnChile();
    const sp = req.nextUrl.searchParams;
    const desde = esFecha(sp.get("desde")) ? sp.get("desde")! : hoy;
    const hasta = esFecha(sp.get("hasta")) ? sp.get("hasta")! : sumarDias(hoy, 180);
    return NextResponse.json({ hoy, obligaciones: await calendario(desde, hasta) });
  } catch (e) {
    return responderError(e, "calendario");
  }
}

/**
 * POST multipart: `datos` (JSON con tipo, periodo, vence_el, monto_pagado,
 * pagado_el…) y opcionalmente `file` con el comprobante.
 */
export async function POST(req: NextRequest) {
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.response;
  try {
    const form = await req.formData();
    let datos: unknown = null;
    try {
      datos = JSON.parse(String(form.get("datos") ?? "null"));
    } catch {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }
    const parsed = esquemaPagoObligacion.safeParse(datos);
    if (!parsed.success) return responderValidacion(parsed.error);
    const archivo = form.get("file");
    const obligacion = await registrarPagoObligacion(
      parsed.data,
      archivo instanceof File && archivo.size > 0 ? archivo : null,
      actorDe(auth.session),
    );
    return NextResponse.json({ obligacion });
  } catch (e) {
    return responderError(e, "calendario.pagar");
  }
}
