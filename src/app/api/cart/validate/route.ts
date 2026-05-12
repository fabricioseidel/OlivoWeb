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

      // Validar Stock
      if (dbProduct.stock < item.quantity) {
        needsUpdate = true;
        updatePayload.insufficientStock = true;
        updatePayload.availableQty = dbProduct.stock;
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
