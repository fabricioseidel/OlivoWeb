import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const items = body.items;

    console.log("[OLIVO:api:validate] 📥 Items recibidos:", items?.length, items?.map((i: any) => `${i.id}(x${i.quantity}@$${i.price})`));

    if (!Array.isArray(items) || items.length === 0) {
      console.log("[OLIVO:api:validate] carrito vacío, retornando updates:[]");
      return NextResponse.json({ updates: [] });
    }

    const itemIds = items.map((i: any) => i.id);
    console.log("[OLIVO:api:validate] Buscando barcodes en DB:", itemIds);

    const { data: dbProducts, error } = await supabaseServer
      .from("products")
      .select("id, barcode, name, sale_price, stock, is_active")
      .in("barcode", itemIds);

    if (error) {
      console.error("[OLIVO:api:validate] ❌ Error Supabase:", error);
      return NextResponse.json({ updates: [] }, { status: 500 });
    }

    /**
     * Stock real de la sucursal que despacha.
     *
     * `products.stock` es un consolidado que puede quedar desfasado del stock
     * por sucursal: se han visto productos con 4 en products.stock y 2 en
     * branch_stock. La creación del pedido descuenta de branch_stock vía
     * decrement_stock_atomic, así que validar contra products.stock dejaba
     * pasar carritos que después el checkout rechazaba con "Stock
     * insuficiente" — sin forma de que el cliente supiera cuál era el máximo.
     *
     * Se valida contra la misma fuente que descuenta. Si no hay fila en
     * branch_stock para ese producto, se cae a products.stock (mismo criterio
     * que la RPC).
     */
    const { data: defaultBranch } = await supabaseServer
      .from("branches")
      .select("id")
      .eq("is_default", true)
      .eq("is_active", true)
      .maybeSingle();

    const branchStock = new Map<string, number>();
    if (defaultBranch?.id) {
      const { data: rows } = await supabaseServer
        .from("branch_stock")
        .select("product_barcode, stock")
        .eq("branch_id", defaultBranch.id)
        .in("product_barcode", itemIds);
      for (const r of rows || []) {
        branchStock.set(String(r.product_barcode), Number(r.stock) || 0);
      }
    }

    const stockFor = (barcode: string, fallback: number) => {
      const b = branchStock.get(String(barcode));
      return typeof b === "number" ? b : fallback;
    };

    console.log("[OLIVO:api:validate] 🗄️ Productos encontrados en DB:", dbProducts?.length, dbProducts?.map((p: any) => `${p.barcode}:stock=${p.stock},precio=$${p.sale_price},activo=${p.is_active}`));

    const updates: any[] = [];

    items.forEach((item: any) => {
      const dbProduct = dbProducts?.find((p) => String(p.barcode) === String(item.id));

      // Si el producto no existe o está inactivo, marcar como stock insuficiente (0)
      if (!dbProduct || !dbProduct.is_active) {
        updates.push({
          id: item.id,
          insufficientStock: true,
          availableQty: 0,
        });
        return;
      }

      let needsUpdate = false;
      const updatePayload: any = { id: item.id };

      // Validar Stock contra la sucursal que despacha
      const disponible = stockFor(dbProduct.barcode, Number(dbProduct.stock) || 0);
      if (disponible < item.quantity) {
        needsUpdate = true;
        updatePayload.insufficientStock = true;
        updatePayload.availableQty = disponible;
      }

      // Validar Precio
      if (dbProduct.sale_price !== item.price) {
        needsUpdate = true;
        updatePayload.priceChanged = true;
        updatePayload.newPrice = dbProduct.sale_price;
      }

      if (needsUpdate) {
        updates.push(updatePayload);
      }
    });

    console.log("[OLIVO:api:validate] 📤 Respuesta final:", { updates_count: updates.length, updates });
    return NextResponse.json({ updates });
  } catch (error) {
    console.error("[OLIVO:api:validate] ❌ Error fatal:", error);
    return NextResponse.json({ updates: [] }, { status: 500 });
  }
}
