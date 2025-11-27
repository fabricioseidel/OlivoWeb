import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function isAdmin(session: any) {
  const role = session?.role || session?.user?.role;
  return typeof role === "string" && role.toUpperCase().includes("ADMIN");
}

async function ensureAdmin() {
  const session: any = await getServerSession(authOptions as any);
  if (!session || !isAdmin(session)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  return session;
}

export async function GET(req: Request) {
  const session = await ensureAdmin();
  if (session instanceof NextResponse) return session;

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
    const query = supabaseAdmin
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
  const session = await ensureAdmin();
  if (session instanceof NextResponse) return session;

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

    const { data, error } = await supabaseAdmin
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

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("[PRODUCT-SUPPLIERS][POST] Unexpected:", error);
    return NextResponse.json(
      { error: "No se pudo guardar la asignación" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request) {
  const session = await ensureAdmin();
  if (session instanceof NextResponse) return session;

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

    const { error } = await supabaseAdmin
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
