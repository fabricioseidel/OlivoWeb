import { NextResponse } from "next/server";
import { requireApiAdmin } from "@/lib/api-auth";
import {
  obtenerFotoPrecios,
  aplicarPrecio,
  marcarRevisado,
} from "@/server/pricing.service";

export const dynamic = "force-dynamic";

/**
 * La foto de precios del catálogo.
 *
 * Sólo ADMIN: expone los costos de proveedor de todo el catálogo, que es
 * información que un vendedor no necesita para trabajar.
 */
export async function GET() {
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.response;

  try {
    return NextResponse.json(await obtenerFotoPrecios());
  } catch (error) {
    console.error("[admin/precios] GET", error);
    return NextResponse.json(
      { error: "No se pudo calcular la foto de precios" },
      { status: 500 }
    );
  }
}

/**
 * Aplica un precio revisado, o marca como revisado el que ya está.
 *
 * Las dos acciones viven juntas porque son la misma decisión tomada por la
 * misma persona en la misma pantalla: "este precio queda así".
 */
export async function POST(req: Request) {
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.response;

  let body: { barcode?: unknown; precio?: unknown; accion?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  const barcode = typeof body.barcode === "string" ? body.barcode.trim() : "";
  if (!barcode) {
    return NextResponse.json({ error: "Falta el código del producto" }, { status: 400 });
  }

  const resultado =
    body.accion === "revisado"
      ? await marcarRevisado(barcode, auth.userId)
      : await aplicarPrecio(barcode, Number(body.precio), auth.userId);

  if (!resultado.ok) {
    return NextResponse.json({ error: resultado.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
