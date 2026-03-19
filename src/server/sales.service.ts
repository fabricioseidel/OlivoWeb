import { supabaseServer } from "@/lib/supabase-server";

/**
 * Creates a sale using DIRECT inserts (no RPC dependency).
 * Uses supabaseServer (service_role key) which bypasses RLS.
 * 
 * Steps:
 * 1. Insert into `sales`
 * 2. Insert into `sale_items` with correct subtotal
 * 3. Update product stock for each item sold
 * 4. Link to active cash shift if one exists
 */
export async function createQuickSale(data: {
  total: number;
  paymentMethod: string;
  items?: Array<{
    product_id: string;   // barcode
    quantity: number;
    unit_price: number;
    total_price: number;
    name?: string;
  }>;
  notas?: string;
  sellerName?: string;
  sellerEmail?: string;
  cashReceived?: number;
  changeGiven?: number;
  tax?: number;
}) {
  // ── Step 1: Insert the sale ──────────────────────────────────────────
  const { data: sale, error: saleErr } = await supabaseServer
    .from("sales")
    .insert({
      total: data.total,
      payment_method: data.paymentMethod,
      notes: data.notas || '',
      device_id: 'web-pos',
      client_sale_id: `web-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      seller_name: data.sellerName || 'Web POS',
      seller_email: data.sellerEmail || '',
      cash_received: data.cashReceived || 0,
      change_given: data.changeGiven || 0,
      tax: data.tax || 0,
    })
    .select("id")
    .single();

  if (saleErr) {
    console.error("🔥 Step 1 FAILED (insert sale):", saleErr);
    throw new Error(`Error al crear venta: ${saleErr.message}`);
  }

  const saleId = sale.id;
  console.log("✅ Step 1: Sale created, ID:", saleId);

  // ── Step 2: Insert sale items ────────────────────────────────────────
  if (data.items && data.items.length > 0) {
    const saleItemsPayload = data.items.map(item => ({
      sale_id: saleId,
      product_barcode: item.product_id,
      product_name: item.name || "Producto",
      quantity: item.quantity,
      unit_price: item.unit_price,
      subtotal: item.total_price,
      discount: 0,
    }));

    const { error: itemsErr } = await supabaseServer
      .from("sale_items")
      .insert(saleItemsPayload);

    if (itemsErr) {
      console.error("🔥 Step 2 FAILED (insert sale_items):", itemsErr);
      // Don't throw — sale is already created, items failure is logged
    } else {
      console.log("✅ Step 2: Sale items inserted:", saleItemsPayload.length);
    }

    // ── Step 3: Update stock for each product ────────────────────────
    for (const item of data.items) {
      const { data: product } = await supabaseServer
        .from("products")
        .select("stock")
        .eq("barcode", item.product_id)
        .maybeSingle();

      if (product) {
        const newStock = Math.max(0, Number(product.stock || 0) - item.quantity);
        await supabaseServer
          .from("products")
          .update({ stock: newStock })
          .eq("barcode", item.product_id);
      }
    }
    console.log("✅ Step 3: Stock updated for", data.items.length, "products");
  }

  // ── Step 4: Link to active shift ─────────────────────────────────────
  try {
    const { data: activeShift } = await supabaseServer
      .from("cash_shifts")
      .select("id")
      .eq("status", "OPEN")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (activeShift?.id) {
      await supabaseServer
        .from("sales")
        .update({ shift_id: activeShift.id })
        .eq("id", saleId);
      console.log("✅ Step 4: Sale linked to shift:", activeShift.id);
    }
  } catch (shiftErr) {
    console.warn("⚠️ Could not link sale to shift (non-critical):", shiftErr);
  }

  return { id: saleId, total: data.total, payment_method: data.paymentMethod };
}
