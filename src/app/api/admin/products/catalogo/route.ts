import { NextRequest, NextResponse } from "next/server";
import { requireApiAdminOrSeller } from "@/lib/api-auth";
import { supabaseServer } from "@/lib/supabase-server";
import {
  COLUMNAS_PANEL,
  COLUMNAS_PUBLICAS,
  buscarEnCatalogo,
  leerCatalogo,
  leerProducto,
} from "@/services/products";

/**
 * GET /api/admin/products/catalogo            → catálogo completo
 * GET /api/admin/products/catalogo?q=texto    → búsqueda (POS, inventario rápido)
 * GET /api/admin/products/catalogo?barcode=X  → un producto
 *
 * El panel leía los productos con la clave pública, y por eso esa clave podía
 * leer el costo de compra de todo el catálogo. Ahora el panel pasa por aquí
 * (service key, con sesión) y a la clave pública se le quitaron esas columnas.
 *
 * Costos y márgenes sólo para ADMIN. El cajero ve lo mismo que la tienda más
 * el stock, que es lo que necesita para vender.
 */
export async function GET(req: NextRequest) {
  const auth = await requireApiAdminOrSeller();
  if (!auth.ok) return auth.response;
  try {
    const columnas = auth.role === "ADMIN" ? COLUMNAS_PANEL : COLUMNAS_PUBLICAS;
    const sp = req.nextUrl.searchParams;
    const barcode = sp.get("barcode");
    if (barcode) {
      return NextResponse.json({ item: await leerProducto(supabaseServer, columnas, barcode) });
    }
    const q = sp.get("q") ?? "";
    const items = q.trim()
      ? await buscarEnCatalogo(supabaseServer, columnas, q)
      : await leerCatalogo(supabaseServer, columnas);
    return NextResponse.json({ items }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("products/catalogo:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error cargando productos" }, { status: 500 });
  }
}
