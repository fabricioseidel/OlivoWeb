import { NextResponse } from "next/server";
import { requireApiAdmin } from "@/lib/api-auth";
import { supabaseServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

type BulkAssignBody = {
  supplier_id?: string;
  barcodes?: string[];
  unit_cost?: number | null;
  pack_size?: number | null;
  default_reorder_qty?: number | null;
  reorder_threshold?: number | null;
  priority?: number | null;
  supplier_sku?: string | null;
  overwrite?: boolean;
};

function num(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function POST(req: Request) {
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.response;

  const body: BulkAssignBody = await req.json().catch(() => ({}));
  const supplierId = (body.supplier_id || "").trim();
  const barcodes = Array.isArray(body.barcodes)
    ? Array.from(new Set(body.barcodes.map((b) => String(b).trim()).filter(Boolean)))
    : [];

  if (!supplierId) {
    return NextResponse.json({ error: "supplier_id es obligatorio" }, { status: 400 });
  }
  if (barcodes.length === 0) {
    return NextResponse.json({ error: "Debe enviar al menos un barcode" }, { status: 400 });
  }
  if (barcodes.length > 1000) {
    return NextResponse.json({ error: "Maximo 1000 productos por lote" }, { status: 400 });
  }

  // Validar que el supplier existe
  const { data: supplier, error: supplierErr } = await supabaseServer
    .from("suppliers")
    .select("id,name")
    .eq("id", supplierId)
    .maybeSingle();
  if (supplierErr || !supplier) {
    return NextResponse.json({ error: "Proveedor no encontrado" }, { status: 404 });
  }

  // Filtrar barcodes que existen en products
  const { data: existing, error: prodErr } = await supabaseServer
    .from("products")
    .select("barcode")
    .in("barcode", barcodes);
  if (prodErr) {
    console.error("[bulk-assign] products lookup error", prodErr);
    return NextResponse.json({ error: "Error validando productos" }, { status: 500 });
  }
  const validBarcodes = (existing ?? []).map((r: any) => String(r.barcode));
  const skippedUnknown = barcodes.filter((b) => !validBarcodes.includes(b));

  if (validBarcodes.length === 0) {
    return NextResponse.json({ error: "Ningun barcode coincide con productos activos" }, { status: 400 });
  }

  // Detectar asignaciones existentes
  const { data: alreadyAssigned } = await supabaseServer
    .from("product_suppliers")
    .select("product_id")
    .in("product_id", validBarcodes)
    .eq("supplier_id", supplierId);
  const alreadySet = new Set((alreadyAssigned ?? []).map((r: any) => String(r.product_id)));

  const overwrite = Boolean(body.overwrite);
  const defaults = {
    priority: body.priority ?? 1,
    supplier_sku: body.supplier_sku ?? null,
    unit_cost: num(body.unit_cost),
    pack_size: body.pack_size != null ? Math.max(1, Math.floor(Number(body.pack_size))) : null,
    default_reorder_qty: body.default_reorder_qty != null ? Math.max(0, Math.floor(Number(body.default_reorder_qty))) : null,
    reorder_threshold: body.reorder_threshold != null ? Math.max(0, Math.floor(Number(body.reorder_threshold))) : null,
  };

  let inserted = 0;
  let updated = 0;

  // Update existentes solo si overwrite=true
  if (overwrite && alreadySet.size > 0) {
    const updateTargets = Array.from(alreadySet);
    const { error: updErr, count } = await supabaseServer
      .from("product_suppliers")
      .update({ ...defaults, updated_at: new Date().toISOString() }, { count: "exact" })
      .in("product_id", updateTargets)
      .eq("supplier_id", supplierId);
    if (updErr) {
      console.error("[bulk-assign] update error", updErr);
      return NextResponse.json({ error: "Error actualizando asignaciones existentes" }, { status: 500 });
    }
    updated = count ?? updateTargets.length;
  }

  // Insert solo los que no existian
  const newRows = validBarcodes
    .filter((b) => !alreadySet.has(b))
    .map((b) => ({ product_id: b, supplier_id: supplierId, ...defaults }));

  if (newRows.length > 0) {
    const { error: insErr, count } = await supabaseServer
      .from("product_suppliers")
      .insert(newRows, { count: "exact" });
    if (insErr) {
      console.error("[bulk-assign] insert error", insErr);
      return NextResponse.json({ error: "Error creando asignaciones", details: insErr.message }, { status: 500 });
    }
    inserted = count ?? newRows.length;
  }

  return NextResponse.json({
    ok: true,
    supplier: { id: supplier.id, name: supplier.name },
    inserted,
    updated,
    skipped_existing: overwrite ? 0 : alreadySet.size,
    skipped_unknown_barcodes: skippedUnknown,
  });
}
