import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const items = body.items;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ updates: [] });
    }

    const itemIds = items.map((i: any) => i.id);

    // Obtener datos reales de los productos desde la base de datos
    const { data: dbProducts, error } = await supabaseServer
      .from("products")
      .select("id, name, sale_price, stock, is_active")
      .in("id", itemIds);

    if (error) {
      console.error("Error validando carrito:", error);
      return NextResponse.json({ updates: [] }, { status: 500 });
    }

    const updates: any[] = [];

    items.forEach((item: any) => {
      const dbProduct = dbProducts?.find((p) => p.id === item.id);

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

    return NextResponse.json({ updates });
  } catch (error) {
    console.error("Error en validación de carrito:", error);
    return NextResponse.json({ updates: [] }, { status: 500 });
  }
}
