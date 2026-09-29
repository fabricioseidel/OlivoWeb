import { NextRequest, NextResponse } from "next/server";
import { requireApiAdminOrSeller } from "@/lib/api-auth";
import { supabaseServer } from "@/lib/supabase-server";
import { BUCKET_COMPROBANTES, esPathPermitido } from "@/server/archivos-privados";

/**
 * GET /api/admin/archivos?path=ventas/123/…
 * Abre un comprobante del bucket privado: redirige a una URL firmada de 5
 * minutos. Sólo personal con sesión, y sólo dentro de las carpetas de
 * comprobantes.
 */
export async function GET(req: NextRequest) {
  const auth = await requireApiAdminOrSeller();
  if (!auth.ok) return auth.response;
  const path = req.nextUrl.searchParams.get("path") ?? "";
  if (!esPathPermitido(path)) {
    return NextResponse.json({ error: "Archivo no válido" }, { status: 400 });
  }
  const { data, error } = await supabaseServer.storage.from(BUCKET_COMPROBANTES).createSignedUrl(path, 300);
  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });
  }
  return NextResponse.redirect(data.signedUrl, { headers: { "Cache-Control": "private, no-store" } });
}
