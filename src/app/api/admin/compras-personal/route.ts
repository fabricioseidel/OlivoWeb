import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { requireApiAdminOrSeller } from "@/lib/api-auth";

/**
 * GET  /api/admin/compras-personal  → compras de personal pendientes de cobro,
 *      agrupadas por vendedor, para liquidar contra el sueldo a fin de mes.
 * POST /api/admin/compras-personal  → marca ventas como liquidadas (descontadas).
 */
export async function GET(request: NextRequest) {
  const auth = await requireApiAdminOrSeller();
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const incluirLiquidadas = searchParams.get("incluirLiquidadas") === "1";

    let query = supabaseServer
      .from("sales")
      .select("id, ts, total, seller_id, seller_name, staff_settled_at, voided")
      .eq("is_staff_purchase", true)
      .eq("voided", false)
      .order("ts", { ascending: false })
      .limit(500);

    if (!incluirLiquidadas) query = query.is("staff_settled_at", null);

    const { data, error } = await query;
    if (error) throw error;

    // Agrupar por vendedor para la liquidación mensual
    const porVendedor = new Map<
      string,
      { sellerId: string | null; sellerName: string; total: number; ventas: typeof data }
    >();

    for (const venta of data || []) {
      const clave = venta.seller_id || venta.seller_name || "sin-vendedor";
      const actual = porVendedor.get(clave) ?? {
        sellerId: venta.seller_id ?? null,
        sellerName: venta.seller_name || "Sin vendedor",
        total: 0,
        ventas: [] as typeof data,
      };
      actual.total += Number(venta.total) || 0;
      actual.ventas.push(venta);
      porVendedor.set(clave, actual);
    }

    return NextResponse.json({
      vendedores: Array.from(porVendedor.values()).sort((a, b) => b.total - a.total),
      totalPendiente: (data || []).reduce((acc, v) => acc + (Number(v.total) || 0), 0),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error interno";
    console.error("[compras-personal][GET]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // Liquidar es una acción contable: sólo admin, no vendedores
  const auth = await requireApiAdminOrSeller();
  if (!auth.ok) return auth.response;
  if (auth.role !== "ADMIN") {
    return NextResponse.json({ error: "Solo un administrador puede liquidar" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const saleIds: number[] = Array.isArray(body?.saleIds) ? body.saleIds : [];
    if (saleIds.length === 0) {
      return NextResponse.json({ error: "Sin ventas para liquidar" }, { status: 400 });
    }

    const { error } = await supabaseServer
      .from("sales")
      .update({ staff_settled_at: new Date().toISOString() })
      .in("id", saleIds)
      .eq("is_staff_purchase", true)
      .is("staff_settled_at", null); // no re-liquidar lo ya descontado

    if (error) throw error;

    return NextResponse.json({ ok: true, liquidadas: saleIds.length });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error interno";
    console.error("[compras-personal][POST]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
