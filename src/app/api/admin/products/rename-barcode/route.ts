import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiAdmin } from "@/lib/api-auth";
import { supabaseServer } from "@/lib/supabase-server";

const renameSchema = z.object({
  oldBarcode: z.string().trim().min(1),
  newBarcode: z.string().trim().min(1).max(255),
});

/**
 * POST /api/admin/products/rename-barcode
 *
 * `barcode` is the product's business key (upserts elsewhere use
 * `onConflict: 'barcode'`), so this can't go through the normal bulk-save
 * upsert — that would create a duplicate row instead of renaming the
 * existing one. It also can't be a plain UPDATE: sale_items, inventory_movements,
 * branch_stock and product_suppliers all carry the barcode as a plain text
 * column with no enforced FK in this database, so a bare UPDATE would
 * silently orphan a product's history. The `rename_product_barcode` RPC
 * (see 20260716000000_rename_product_barcode_rpc migration) updates all of
 * them in one atomic transaction.
 *
 * Body: { oldBarcode: string; newBarcode: string }
 */
export async function POST(req: Request) {
  try {
    const auth = await requireApiAdmin();
    if (!auth.ok) return auth.response;

    const body = await req.json().catch(() => null);
    const parsed = renameSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: `Datos inválidos: ${parsed.error.issues.map((i) => i.message).join(", ")}` },
        { status: 400 }
      );
    }

    const { oldBarcode, newBarcode } = parsed.data;

    const { error } = await supabaseServer.rpc("rename_product_barcode", {
      p_old_barcode: oldBarcode,
      p_new_barcode: newBarcode,
    });

    if (error) {
      const status = /ya está en uso|inválido|es igual|no existe/i.test(error.message) ? 409 : 500;
      return NextResponse.json({ error: error.message }, { status });
    }

    return NextResponse.json({ success: true, oldBarcode, newBarcode });
  } catch (err: any) {
    console.error("rename-barcode error:", err);
    return NextResponse.json({ error: err.message || "Error renombrando el código de barras" }, { status: 500 });
  }
}
