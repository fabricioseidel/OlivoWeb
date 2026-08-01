import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { requireApiAdminOrSeller } from "@/lib/api-auth";

/**
 * GET /api/admin/caja/estado
 * Indica si hay un turno de caja abierto. Lo consulta el POS antes de permitir
 * vender: sin caja abierta las ventas quedan fuera del arqueo del día.
 */
export async function GET() {
  const auth = await requireApiAdminOrSeller();
  if (!auth.ok) return auth.response;

  try {
    const { data, error } = await supabaseServer
      .from("cash_shifts")
      // El monto de apertura está en `starting_cash`; `opening_amount` no
      // existe en la tabla y hacía fallar la consulta entera en cada sondeo.
      .select("id, started_at, starting_cash")
      .eq("status", "OPEN")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({
      open: Boolean(data?.id),
      shiftId: data?.id ?? null,
      startedAt: data?.started_at ?? null,
      startingCash: data?.starting_cash ?? null,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error interno";
    console.error("[caja/estado]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
