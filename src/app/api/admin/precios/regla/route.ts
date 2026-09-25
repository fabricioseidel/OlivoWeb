import { NextResponse } from "next/server";
import { requireApiAdmin } from "@/lib/api-auth";
import { supabaseServer } from "@/lib/supabase-server";
import {
  impactoDeLaRegla,
  invalidateSellableRuleCache,
} from "@/server/sellable.service";

export const dynamic = "force-dynamic";

/**
 * La regla de venta web y su impacto.
 *
 * El interruptor vive acá y no en la configuración general a propósito: lo que
 * hace falta para decidir encenderlo —cuántos productos quedarían fuera y
 * cuáles— se calcula en esta misma respuesta. Separarlos dejaría el interruptor
 * a un clic de distancia de su consecuencia, que es como se enciende algo sin
 * mirar.
 */
export async function GET() {
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.response;

  try {
    return NextResponse.json(await impactoDeLaRegla());
  } catch (error) {
    console.error("[admin/precios/regla] GET", error);
    return NextResponse.json(
      { error: "No se pudo calcular el impacto de la regla" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.response;

  let body: { activa?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  if (typeof body.activa !== "boolean") {
    return NextResponse.json({ error: "Falta indicar si la regla queda activa" }, { status: 400 });
  }

  const { error } = await supabaseServer
    .from("settings")
    .upsert([{ id: true, require_reviewed_price: body.activa }], { onConflict: "id" });

  if (error) {
    console.error("[admin/precios/regla] PUT", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // El valor se cachea unos segundos: sin esto, apagar la regla tardaría en
  // surtir efecto justo cuando alguien la apaga porque está bloqueando ventas.
  invalidateSellableRuleCache();

  return NextResponse.json({ ok: true, activa: body.activa });
}
