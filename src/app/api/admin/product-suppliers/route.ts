import { NextResponse } from "next/server";
import { requireApiAdmin } from "@/lib/api-auth";
import { supabaseServer } from "@/lib/supabase-server";
import { avisoPorCosto, MARGEN_POR_DEFECTO, TASA_IVA, type ModoRedondeo } from "@/lib/pricing";
import { CATEGORIA_POR_DEFECTO } from "@/server/pricing.service";

/**
 * ¿Este costo deja el producto vendiéndose a pérdida o por debajo de su margen?
 *
 * Se comprueba al guardar y el resultado viaja en la respuesta como `aviso`.
 * No impide guardar: puede ser deliberado, y quien carga la factura no siempre
 * es quien fija el precio. Lo que no puede pasar es que nadie se entere.
 */
async function comprobarCosto(productId: string, unitCost: number | null, taxRate: number) {
  if (unitCost === null || !Number.isFinite(unitCost) || unitCost <= 0) return null;

  const { data: producto } = await supabaseServer
    .from("products")
    .select("name, category, sale_price, margin_override")
    .eq("barcode", productId)
    .maybeSingle();

  if (!producto) return null;

  // El margen objetivo sale del producto, de su categoría o de la regla
  // general — el mismo orden que usa la pantalla de Precios.
  const { data: reglas } = await supabaseServer
    .from("category_margins")
    .select("category, margin, rounding")
    .in("category", [producto.category ?? "", CATEGORIA_POR_DEFECTO]);

  const porCategoria = (reglas ?? []).find((r: any) => r.category === producto.category);
  const general = (reglas ?? []).find((r: any) => r.category === CATEGORIA_POR_DEFECTO);
  const regla = porCategoria ?? general;

  const margen =
    producto.margin_override != null
      ? Number(producto.margin_override)
      : regla
        ? Number(regla.margin)
        : MARGEN_POR_DEFECTO;

  const aviso = avisoPorCosto({
    precioVenta: Number(producto.sale_price ?? 0),
    costoNeto: unitCost,
    tasa: taxRate,
    margen,
    redondeo: (regla?.rounding as ModoRedondeo) ?? "decena",
  });

  return aviso ? { ...aviso, producto: producto.name } : null;
}

export async function GET(req: Request) {
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const productId = searchParams.get("productId");
  const supplierId = searchParams.get("supplierId");

  if (!productId && !supplierId) {
    return NextResponse.json(
      { error: "Se requiere productId o supplierId" },
      { status: 400 },
    );
  }

  try {
    const query = supabaseServer
      .from("product_suppliers")
      .select(
        `
        id,
        product_id,
        supplier_id,
        priority,
        supplier_sku,
        pack_size,
        unit_cost,
        default_reorder_qty,
        reorder_threshold,
        notes,
        supplier:supplier_id (
          id,
          name,
          contact_name,
          phone,
          whatsapp,
          email
        )
      `,
      )
      .order("priority", { ascending: true });

    if (productId) {
      query.eq("product_id", productId);
    }
    if (supplierId) {
      query.eq("supplier_id", supplierId);
    }

    const { data, error } = await query;
    if (error) {
      console.error("[PRODUCT-SUPPLIERS][GET] Error:", error);
      return NextResponse.json(
        { error: "No se pudieron cargar las asignaciones" },
        { status: 500 },
      );
    }

    return NextResponse.json(data ?? []);
  } catch (error) {
    console.error("[PRODUCT-SUPPLIERS][GET] Unexpected:", error);
    return NextResponse.json(
      { error: "No se pudieron cargar las asignaciones" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const productId = String(body?.productId ?? "").trim();
    const supplierId = String(body?.supplierId ?? "").trim();

    if (!productId || !supplierId) {
      return NextResponse.json(
        { error: "Producto y proveedor son obligatorios" },
        { status: 400 },
      );
    }

    const payload = {
      product_id: productId,
      supplier_id: supplierId,
      priority:
        typeof body?.priority === "number" && body.priority > 0
          ? body.priority
          : 1,
      supplier_sku: body?.supplierSku ? String(body.supplierSku).trim() : null,
      pack_size:
        typeof body?.packSize === "number" ? Math.max(1, body.packSize) : null,
      unit_cost:
        body?.unitCost != null ? Number.parseFloat(body.unitCost) : null,
      default_reorder_qty:
        typeof body?.defaultReorderQty === "number"
          ? Math.max(1, body.defaultReorderQty)
          : null,
      reorder_threshold:
        typeof body?.reorderThreshold === "number"
          ? Math.max(0, body.reorderThreshold)
          : null,
      notes: body?.notes ? String(body.notes).trim() : null,
    };

    const { data, error } = await supabaseServer
      .from("product_suppliers")
      .upsert(payload, { onConflict: "product_id,supplier_id" })
      .select()
      .maybeSingle();

    if (error) {
      console.error("[PRODUCT-SUPPLIERS][POST] Error:", error);
      return NextResponse.json(
        { error: "No se pudo guardar la asignación" },
        { status: 500 },
      );
    }

    // El costo ya quedó guardado: el aviso es información, no una condición.
    // Si la comprobación falla, se guarda igual y se pierde el aviso — pero
    // nunca la asignación, que es lo que el usuario pidió hacer.
    let aviso = null;
    try {
      aviso = await comprobarCosto(
        productId,
        payload.unit_cost,
        typeof body?.taxRate === "number" ? body.taxRate : TASA_IVA,
      );
    } catch (e) {
      console.error("[PRODUCT-SUPPLIERS][POST] no se pudo comprobar el costo:", e);
    }

    return NextResponse.json({ ...data, aviso }, { status: 201 });
  } catch (error) {
    console.error("[PRODUCT-SUPPLIERS][POST] Unexpected:", error);
    return NextResponse.json(
      { error: "No se pudo guardar la asignación" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request) {
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const productId = String(body?.productId ?? "").trim();
    const supplierId = String(body?.supplierId ?? "").trim();

    if (!productId || !supplierId) {
      return NextResponse.json(
        { error: "Producto y proveedor son obligatorios" },
        { status: 400 },
      );
    }

    const { error } = await supabaseServer
      .from("product_suppliers")
      .delete()
      .eq("product_id", productId)
      .eq("supplier_id", supplierId);

    if (error) {
      console.error("[PRODUCT-SUPPLIERS][DELETE] Error:", error);
      return NextResponse.json(
        { error: "No se pudo eliminar la asignación" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[PRODUCT-SUPPLIERS][DELETE] Unexpected:", error);
    return NextResponse.json(
      { error: "No se pudo eliminar la asignación" },
      { status: 500 },
    );
  }
}
