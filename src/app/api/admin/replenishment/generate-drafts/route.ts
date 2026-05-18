import { NextResponse } from "next/server";
import { requireApiAdmin } from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

function clampInt(value: any, def: number, min: number, max: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return def;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

export async function POST(req: Request) {
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.response;

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const windowDays = clampInt(body.windowDays ?? body.window, 30, 7, 180);
  const coverageDays = clampInt(body.coverageDays ?? body.coverage, 14, 1, 90);
  const safetyDays = clampInt(body.safetyDays ?? body.safety, 3, 0, 30);

  const { data, error } = await supabaseAdmin.rpc("create_draft_supplier_orders", {
    p_window_days: windowDays,
    p_coverage_days: coverageDays,
    p_safety_days: safetyDays,
    p_created_by: auth.userId || null,
  });

  if (error) {
    console.error("[replenishment/generate-drafts] rpc error", error);
    return NextResponse.json({ error: "No se pudieron generar los borradores", details: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    params: { windowDays, coverageDays, safetyDays },
    result: data,
  });
}
