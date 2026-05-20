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
  const includeAssigned =
    searchParams.get("includeAssigned") === "1" ||
    searchParams.get("includeAssigned") === "true";
  const limit = Math.min(
    500,
    Math.max(1, Number(searchParams.get("limit")) || 200)
  );

  // Mapa barcode → lista de proveedores asignados (id+name)
  const { data: assignedRows } = await supabaseAdmin
    .from("product_suppliers")
    .select("product_id, supplier:supplier_id ( id, name )");
  const assignedMap = new Map<
    string,
    Array<{ id: string; name: string | null }>
  >();
  for (const row of (assignedRows ?? []) as any[]) {
    const key = String(row.product_id);
    const list = assignedMap.get(key) ?? [];
    if (row.supplier) list.push({ id: row.supplier.id, name: row.supplier.name });
    assignedMap.set(key, list);
  }

  let q = supabaseAdmin
    .from("products")
    .select(
      "barcode,name,category,stock,sale_price,purchase_price,image_url,is_active"
    )
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
    return NextResponse.json(
      { error: "No se pudieron cargar los productos" },
      { status: 500 }
    );
  }

  const enriched = (data ?? []).map((p: any) => {
    const suppliers = assignedMap.get(String(p.barcode)) ?? [];
    return {
      ...p,
      hasSupplier: suppliers.length > 0,
      assignedSuppliers: suppliers,
    };
  });

  const filtered = includeAssigned
    ? enriched
    : enriched.filter((p) => !p.hasSupplier);

  const rows = filtered.slice(0, limit);

  return NextResponse.json({
    total: rows.length,
    items: rows,
    includeAssigned,
    assignedCount: enriched.filter((p) => p.hasSupplier).length,
    unassignedCount: enriched.filter((p) => !p.hasSupplier).length,
  });
}

