import { NextResponse } from "next/server";
import { requireApiAdmin } from "@/lib/api-auth";
import { hoyEnChile } from "@/lib/documentos/vencimientos";
import { panel } from "@/server/documentos.service";
import { responderError } from "../_lib/respuesta";

/** GET: lo que el dueño ve primero — qué vence, cuánto, y qué falta revisar. */
export async function GET() {
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.response;
  try {
    return NextResponse.json(await panel(hoyEnChile()));
  } catch (e) {
    return responderError(e, "panel");
  }
}
