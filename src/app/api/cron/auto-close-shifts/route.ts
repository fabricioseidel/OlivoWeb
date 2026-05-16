import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * Cron: cierra automáticamente los turnos cuyo auto_close_at ya pasó.
 *
 * Vercel Cron invoca este endpoint según vercel.json. Se autentica con
 * el header `Authorization: Bearer ${CRON_SECRET}` (Vercel lo inyecta
 * automáticamente cuando defines CRON_SECRET en el dashboard).
 *
 * El cierre automático usa close_shift con un conteo vacío {} — es decir,
 * se cuenta como 0 en todos los métodos, lo que produce diferencias visibles
 * pero deja el turno cerrado para que el cajero pueda revisarlo después.
 * Esto es preferible a dejar turnos abiertos indefinidamente.
 */
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data: pending, error: queryError } = await supabaseAdmin
      .from("cash_shifts")
      .select("id, branch_id, started_at, auto_close_at")
      .eq("status", "OPEN")
      .not("auto_close_at", "is", null)
      .lt("auto_close_at", new Date().toISOString());

    if (queryError) throw queryError;

    if (!pending?.length) {
      return NextResponse.json({ closed: 0, message: "No hay turnos para cerrar" });
    }

    const results: Array<{ shift_id: string; ok: boolean; error?: string }> = [];
    for (const shift of pending) {
      const { error: rpcError } = await supabaseAdmin.rpc("close_shift", {
        p_shift_id: shift.id,
        p_counts: {},
      });
      results.push({
        shift_id: shift.id,
        ok: !rpcError,
        error: rpcError?.message,
      });
    }

    return NextResponse.json({
      closed: results.filter(r => r.ok).length,
      failed: results.filter(r => !r.ok).length,
      results,
    });
  } catch (error: any) {
    console.error("auto-close-shifts cron error:", error);
    return NextResponse.json({ error: error?.message ?? "Error" }, { status: 500 });
  }
}
