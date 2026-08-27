import { NextResponse } from "next/server";
import { requireApiAdmin } from "@/lib/api-auth";
import { obtenerAprendizaje } from "@/server/learning.service";

export const dynamic = "force-dynamic";

/**
 * Las seis reglas de aprendizaje sobre el historial propio.
 *
 * Sólo ADMIN: cruza costos de proveedor con ventas, que es justo el par que un
 * vendedor no necesita ver para trabajar.
 */
export async function GET() {
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.response;

  try {
    return NextResponse.json(await obtenerAprendizaje());
  } catch (error) {
    console.error("[admin/aprendizaje] GET", error);
    return NextResponse.json(
      { error: "No se pudo calcular el aprendizaje" },
      { status: 500 }
    );
  }
}
