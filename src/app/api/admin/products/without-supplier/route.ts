import { NextResponse } from "next/server";
import { requireApiAdmin } from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const search = (searchParams.get("search") || "").trim();
  const category = (searchParams.get("category") || "").trim();
  const limit = Math.min(500, Math.max(1, Number(searchParams.get("limit")) || 200));

  // Productos que NO tienen ninguna fila en product_suppliers
  const { data: assigned } = await supabaseAdmin
    .from("product_suppliers")
    .select("product_id");
  const assignedSet = new Set((assigned ?? []).map((r: any) => String(r.product_id)));

  let q = supabaseAdmin
    .from("products")
    .select("barcode,name,category,stock,sale_price,purchase_price,image_url,is_active")
    .eq("is_active", true)
    .order("name", { ascending: true })
    .limit(Math.max(limit * 2, 500));

  if (search) {
    q = q.or(`name.ilike.%${search}%,barcode.ilike.%${search}%`);
  }
  if (category) {
    q = q.eq("category", category);
  }

  const { data, error } = await q;
  if (error) {
    console.error("[products/without-supplier] error", error);
    return NextResponse.json({ error: "No se pudieron cargar los productos" }, { status: 500 });
  }

  const rows = (data ?? [])
    .filter((p: any) => !assignedSet.has(String(p.barcode)))
    .slice(0, limit);

  return NextResponse.json({
    total: rows.length,
    items: rows,
  });
}
