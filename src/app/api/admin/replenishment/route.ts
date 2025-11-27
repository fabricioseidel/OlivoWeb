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

type ProductRow = {
  barcode: string;
  name: string | null;
  stock: number | null;
  reorder_threshold: number | null;
  sale_price?: number | null;
  image_url?: string | null;
};

export async function GET(req: Request) {
  const session = await ensureAdmin();
  if (session instanceof NextResponse) return session;

  const { searchParams } = new URL(req.url);
  const includeAll = searchParams.get("all") === "1";

  try {
    const { data: products, error: productsError } = await supabaseAdmin
      .from("products")
      .select(
        "barcode,name,stock,reorder_threshold,sale_price,image_url",
      )
      .order("stock", { ascending: true })
      .limit(500);

    if (productsError) {
      console.error("[REPLENISHMENT][GET] products error:", productsError);
      return NextResponse.json(
        { error: "No se pudieron cargar los productos" },
        { status: 500 },
      );
    }

    const productList: ProductRow[] = products ?? [];

    const lowStockProducts = productList.filter((product) => {
      const threshold = product.reorder_threshold ?? 5;
      const stock = Number(product.stock ?? 0);
      return stock <= threshold;
    });

    const targetProducts = includeAll ? productList : lowStockProducts;
    const productIds = targetProducts.map((p) => p.barcode);

    let assignments: any[] = [];
    if (productIds.length) {
      const { data: rows, error: assignmentError } = await supabaseAdmin
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
        .in("product_id", productIds)
        .order("priority", { ascending: true });

      if (assignmentError) {
        console.error(
          "[REPLENISHMENT][GET] assignment error:",
          assignmentError,
        );
        return NextResponse.json(
          { error: "No se pudieron cargar las asignaciones" },
          { status: 500 },
        );
      }
      assignments = rows ?? [];
    }

    const assignmentsByProduct = assignments.reduce<Record<string, any[]>>(
      (acc, row) => {
        const pid = row.product_id;
        if (!pid) return acc;
        if (!acc[pid]) acc[pid] = [];
        acc[pid].push(row);
        return acc;
      },
      {},
    );

    const response = targetProducts.map((product) => {
      const stock = Number(product.stock ?? 0);
      const baseThreshold = product.reorder_threshold ?? 5;
      const productAssignments = assignmentsByProduct[product.barcode] ?? [];

      const enrichedSuppliers = productAssignments.map((assignment) => {
        const threshold =
          assignment.reorder_threshold ??
          assignment.default_reorder_qty ??
          baseThreshold;
        const deficit = Math.max(0, threshold - stock);
        const suggested =
          assignment.default_reorder_qty ??
          (deficit > 0 ? Math.max(deficit, baseThreshold) : baseThreshold);

        return {
          id: assignment.id,
          supplierId: assignment.supplier_id,
          productId: assignment.product_id,
          priority: assignment.priority ?? 1,
          supplierSku: assignment.supplier_sku ?? null,
          packSize: assignment.pack_size ?? null,
          unitCost: assignment.unit_cost ?? null,
          defaultReorderQty: assignment.default_reorder_qty ?? null,
          reorderThreshold: assignment.reorder_threshold ?? null,
          notes: assignment.notes ?? null,
          supplier: assignment.supplier,
          deficit,
          suggestedQty: suggested > 0 ? suggested : baseThreshold,
        };
      });

      const bestAssignment = enrichedSuppliers[0];
      const threshold =
        bestAssignment?.reorderThreshold ??
        bestAssignment?.defaultReorderQty ??
        baseThreshold;

      const deficit = Math.max(0, threshold - stock);

      return {
        productId: product.barcode,
        name: product.name ?? "(Sin nombre)",
        stock,
        threshold,
        deficit,
        salePrice: product.sale_price ?? null,
        imageUrl: product.image_url ?? null,
        suppliers: enrichedSuppliers,
      };
    });

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      totalProducts: productList.length,
      lowStockCount: lowStockProducts.length,
      items: response,
    });
  } catch (error) {
    console.error("[REPLENISHMENT][GET] Unexpected:", error);
    return NextResponse.json(
      { error: "No se pudo generar la información de reposición" },
      { status: 500 },
    );
  }
}
