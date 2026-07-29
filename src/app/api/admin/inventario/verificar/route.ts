import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { requireApiAdminOrSeller } from "@/lib/api-auth";

/**
 * POST /api/admin/inventario/verificar
 * Marca un producto como verificado físicamente y, por lo tanto, activo.
 *
 * La regla del catálogo es: activo = verificado alguna vez. Escanear es la
 * forma de decir "esto sí está en la tienda".
 */
export async function POST(request: NextRequest) {
  const auth = await requireApiAdminOrSeller();
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const barcode = String(body?.barcode ?? "").trim();
    if (!barcode) {
      return NextResponse.json({ error: "Falta el código" }, { status: 400 });
    }

    const { data: product, error: findErr } = await supabaseServer
      .from("products")
      .select("barcode, name, sale_price, is_active, verified_at, stock")
      .eq("barcode", barcode)
      .maybeSingle();

    if (findErr) throw findErr;

    // No existe: el cliente decidirá si buscar por nombre o crearlo
    if (!product) {
      return NextResponse.json({ found: false, barcode }, { status: 200 });
    }

    const yaVerificado = Boolean(product.verified_at);

    const { error: updErr } = await supabaseServer
      .from("products")
      .update({
        is_active: true,
        verified_at: new Date().toISOString(),
        verified_by: auth.session?.user?.name ?? auth.userId ?? null,
      })
      .eq("barcode", barcode);

    if (updErr) throw updErr;

    return NextResponse.json({
      found: true,
      barcode,
      name: product.name,
      salePrice: product.sale_price,
      stock: product.stock,
      /** true si ya venía verificado de una sesión anterior (escaneo repetido) */
      yaVerificado,
      /** true si estaba inactivo y este escaneo lo activó */
      recienActivado: !product.is_active,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error interno";
    console.error("[inventario/verificar]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
