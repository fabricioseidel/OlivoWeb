import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { requireApiAdminOrSeller } from "@/lib/api-auth";

/**
 * GET  /api/admin/inventario/resumen  → cuántos productos están verificados y
 *      cuántos quedarían desactivados si se cierra el inventario ahora.
 * POST /api/admin/inventario/resumen  → desactiva todo lo nunca verificado.
 *
 * La desactivación masiva es deliberadamente un paso aparte y explícito: apaga
 * productos que quizá sí están en la tienda pero aún no se alcanzaron a
 * escanear, así que nunca debe ocurrir como efecto secundario de otra acción.
 */
export async function GET() {
  const auth = await requireApiAdminOrSeller();
  if (!auth.ok) return auth.response;

  try {
    const [verificados, sinVerificarActivos, totales] = await Promise.all([
      supabaseServer
        .from("products")
        .select("barcode", { count: "exact", head: true })
        .not("verified_at", "is", null),
      // Los que la purga apagaría: activos hoy pero nunca verificados
      supabaseServer
        .from("products")
        .select("barcode", { count: "exact", head: true })
        .is("verified_at", null)
        .eq("is_active", true),
      supabaseServer.from("products").select("barcode", { count: "exact", head: true }),
    ]);

    return NextResponse.json({
      verificados: verificados.count ?? 0,
      seDesactivarian: sinVerificarActivos.count ?? 0,
      total: totales.count ?? 0,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error interno";
    console.error("[inventario/resumen][GET]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAdminOrSeller();
  if (!auth.ok) return auth.response;
  // Apagar catálogo es una decisión de negocio: sólo admin
  if (auth.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Solo un administrador puede cerrar el inventario" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    // El cliente envía cuántos espera desactivar; si no calza con lo que hay
    // ahora, se aborta: significa que alguien más siguió escaneando.
    const esperado = Number(body?.esperado);

    const { count: actual } = await supabaseServer
      .from("products")
      .select("barcode", { count: "exact", head: true })
      .is("verified_at", null)
      .eq("is_active", true);

    if (Number.isFinite(esperado) && (actual ?? 0) !== esperado) {
      return NextResponse.json(
        {
          error: "El inventario cambió mientras confirmabas",
          esperado,
          actual: actual ?? 0,
        },
        { status: 409 }
      );
    }

    const { error } = await supabaseServer
      .from("products")
      .update({ is_active: false })
      .is("verified_at", null)
      .eq("is_active", true);

    if (error) throw error;

    return NextResponse.json({ ok: true, desactivados: actual ?? 0 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error interno";
    console.error("[inventario/resumen][POST]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
