import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { requireApiAdminOrSeller } from "@/lib/api-auth";

/**
 * POST /api/admin/inventario/adoptar-codigo
 *
 * El caso real: se escanea un producto en la góndola, su código no está en
 * el catálogo, se busca por nombre y aparece — cargado con un código
 * interno (900000000xxx) porque entró sin escáner. Hasta ahora elegirlo
 * sólo ajustaba el stock y el código escaneado se perdía, así que la
 * siguiente pasada volvía a no encontrarlo.
 *
 * Acá el producto ADOPTA el código escaneado: `rename_product_barcode`
 * arrastra ventas, movimientos, stock por sucursal, conteos, proveedores e
 * historial de costos, y recién después marca el producto como verificado.
 *
 * Es la misma operación que `/api/admin/products/rename-barcode`, pero esa
 * es sólo para admin y el inventario lo hacen los vendedores.
 *
 * Body: { oldBarcode: string; newBarcode: string }
 */
export async function POST(request: NextRequest) {
  const auth = await requireApiAdminOrSeller();
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const oldBarcode = String(body?.oldBarcode ?? "").trim();
    const newBarcode = String(body?.newBarcode ?? "").trim();

    if (!oldBarcode || !newBarcode) {
      return NextResponse.json({ error: "Faltan los códigos" }, { status: 400 });
    }
    if (oldBarcode === newBarcode) {
      return NextResponse.json({ error: "El código es el mismo" }, { status: 400 });
    }

    const { data: destino, error: findErr } = await supabaseServer
      .from("products")
      .select("barcode, name, is_active")
      .eq("barcode", oldBarcode)
      .maybeSingle();

    if (findErr) throw findErr;
    if (!destino) {
      return NextResponse.json(
        { error: `No existe ningún producto con código ${oldBarcode}` },
        { status: 404 }
      );
    }

    const { error: renameErr } = await supabaseServer.rpc("rename_product_barcode", {
      p_old_barcode: oldBarcode,
      p_new_barcode: newBarcode,
    });

    if (renameErr) {
      // "ya está en uso" es del usuario, no del servidor: otro producto se
      // quedó con ese código y hay que decidir cuál de los dos queda.
      const status = /ya está en uso|inválido|es igual|no existe/i.test(renameErr.message)
        ? 409
        : 500;
      return NextResponse.json({ error: renameErr.message }, { status });
    }

    const { error: updErr } = await supabaseServer
      .from("products")
      .update({
        is_active: true,
        verified_at: new Date().toISOString(),
        verified_by: auth.session?.user?.name ?? auth.userId ?? null,
      })
      .eq("barcode", newBarcode);

    if (updErr) throw updErr;

    return NextResponse.json({
      barcode: newBarcode,
      codigoAnterior: oldBarcode,
      name: destino.name,
      recienActivado: !destino.is_active,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error interno";
    console.error("[inventario/adoptar-codigo]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
