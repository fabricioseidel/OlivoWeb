import { NextResponse } from "next/server";
import { requireApiAdmin } from "@/lib/api-auth";
import { supabaseServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

function parseIntParam(value: string | null, def: number, min: number, max: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return def;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

export async function GET(req: Request) {
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const windowDays = parseIntParam(searchParams.get("window"), 30, 7, 180);
  const coverageDays = parseIntParam(searchParams.get("coverage"), 14, 1, 90);
  const safetyDays = parseIntParam(searchParams.get("safety"), 3, 0, 30);
  const onlyWithSupplier = searchParams.get("onlyWithSupplier") === "1";

  const { data, error } = await supabaseServer.rpc("get_reorder_suggestions", {
    p_window_days: windowDays,
    p_coverage_days: coverageDays,
    p_safety_days: safetyDays,
  });

  if (error) {
    console.error("[replenishment/suggestions] rpc error", error);
    return NextResponse.json({ error: "No se pudieron calcular las sugerencias" }, { status: 500 });
  }

  const rows = Array.isArray(data) ? data : [];
  const filtered = onlyWithSupplier ? rows.filter((r: any) => r.supplier_id) : rows;

  const bySupplier = new Map<string, any>();
  let grandTotal = 0;
  for (const r of filtered) {
    const key = r.supplier_id || "__no_supplier__";
    if (!bySupplier.has(key)) {
      bySupplier.set(key, {
        supplier_id: r.supplier_id,
        supplier_name: r.supplier_name,
        items: [] as any[],
        items_count: 0,
        estimated_total: 0,
      });
    }
    const bucket = bySupplier.get(key);
    bucket.items.push(r);
    bucket.items_count += 1;
    bucket.estimated_total += Number(r.estimated_cost || 0);
    grandTotal += Number(r.estimated_cost || 0);
  }

  return NextResponse.json({
    params: { windowDays, coverageDays, safetyDays, onlyWithSupplier },
    total_items: filtered.length,
    estimated_total: grandTotal,
    suppliers: Array.from(bySupplier.values()),
    generated_at: new Date().toISOString(),
  });
}
