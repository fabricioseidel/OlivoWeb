import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { requireApiAdminOrSeller } from "@/lib/api-auth";

/**
 * GET /api/admin/inventario/buscar?q=texto
 * Busca por nombre cuando el código escaneado no existe: puede ser el mismo
 * producto cargado con otro código (típico de códigos genéricos).
 * Incluye inactivos a propósito — el objetivo es justamente reactivarlos.
 */
export async function GET(request: NextRequest) {
  const auth = await requireApiAdminOrSeller();
  if (!auth.ok) return auth.response;

  try {
    const q = (new URL(request.url).searchParams.get("q") ?? "").trim();
    if (q.length < 2) return NextResponse.json({ productos: [] });

    // Escapar comodines para que el texto se busque literal
    const patron = `%${q.replace(/[\\%_]/g, "\\$&")}%`;

    const { data, error } = await supabaseServer
      .from("products")
      .select("barcode, name, sale_price, is_active, verified_at, stock")
      .ilike("name", patron)
      .order("name")
      .limit(25);

    if (error) throw error;

    return NextResponse.json({ productos: data ?? [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error interno";
    console.error("[inventario/buscar]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
