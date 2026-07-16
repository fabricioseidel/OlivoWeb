import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase-server";

const renameSchema = z.object({
  oldBarcode: z.string().trim().min(1),
  newBarcode: z.string().trim().min(1).max(255),
});

/**
 * POST /api/admin/products/rename-barcode
 *
 * `barcode` is the product's business primary key (upserts elsewhere use
 * `onConflict: 'barcode'`), so this can't go through the normal bulk-save
 * upsert — that would create a duplicate row instead of renaming the
 * existing one. This does a real UPDATE, which the
 * `20260716000000_barcode_rename_cascade` migration made safe by adding
 * ON UPDATE CASCADE to every FK referencing products(barcode).
 *
 * Body: { oldBarcode: string; newBarcode: string }
 */
export async function POST(req: Request) {
  try {
    const session: any = await getServerSession(authOptions as any);
    const role = (session as any)?.role || (session?.user as any)?.role || "";

    if (!session || !String(role).toUpperCase().includes("ADMIN")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const parsed = renameSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: `Datos inválidos: ${parsed.error.issues.map((i) => i.message).join(", ")}` },
        { status: 400 }
      );
    }

    const { oldBarcode, newBarcode } = parsed.data;
    if (oldBarcode === newBarcode) {
      return NextResponse.json({ error: "El nuevo código es igual al actual" }, { status: 400 });
    }

    const { data: existing, error: existingError } = await supabaseServer
      .from("products")
      .select("barcode")
      .eq("barcode", oldBarcode)
      .maybeSingle();
    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 });
    }
    if (!existing) {
      return NextResponse.json({ error: `No existe ningún producto con código ${oldBarcode}` }, { status: 404 });
    }

    const { data: conflict, error: conflictError } = await supabaseServer
      .from("products")
      .select("barcode")
      .eq("barcode", newBarcode)
      .maybeSingle();
    if (conflictError) {
      return NextResponse.json({ error: conflictError.message }, { status: 500 });
    }
    if (conflict) {
      return NextResponse.json(
        { error: `El código ${newBarcode} ya está en uso por otro producto` },
        { status: 409 }
      );
    }

    const { error: updateError } = await supabaseServer
      .from("products")
      .update({ barcode: newBarcode })
      .eq("barcode", oldBarcode);
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, oldBarcode, newBarcode });
  } catch (err: any) {
    console.error("rename-barcode error:", err);
    return NextResponse.json({ error: err.message || "Error renombrando el código de barras" }, { status: 500 });
  }
}
