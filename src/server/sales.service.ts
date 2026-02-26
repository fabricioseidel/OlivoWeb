import { supabaseServer } from "@/lib/supabase-server";
import { QuickSaleFormData } from "@/schemas/sale.schema";

const SALES_TABLE = "sales";

export type SaleRecord = {
  id: string;
  sale_number?: string | null;
  customer_id?: string | null;
  total: number;
  payment_method: string;
  status: string;
  created_at?: string;
};

function mapFormToRow(data: QuickSaleFormData) {
  return {
    customer_id: data.customerId ?? null,
    total: data.total,
    subtotal: data.total,
    payment_method: data.paymentMethod,
    notes: data.notas ?? null,
  };
}

export async function createQuickSale(data: QuickSaleFormData): Promise<SaleRecord> {
  const payload = mapFormToRow(data);
  const { data: inserted, error } = await supabaseServer
    .from(SALES_TABLE)
    .insert({
      ...payload,
      status: "completed",
    })
    .select("*")
    .single();

  if (error) throw error;

  // Si hay items, registrarlos y crear movimientos
  if (data.items && data.items.length > 0) {
    const saleItemsPayload = data.items.map(item => ({
      sale_id: inserted.id,
      product_barcode: item.product_id, // Asumiendo que usamos el ID como barcode en la vista
      product_name: "Producto Seleccionado", // Idealmente se pasa desde el form
      quantity: item.quantity,
      unit_price: item.unit_price,
      subtotal: item.total_price,
      discount: 0
    }));

    await supabaseServer.from("sale_items").insert(saleItemsPayload);

    const movementsPayload = data.items.map(item => ({
      product_barcode: item.product_id, // we pass the barcode in product_id from the UI
      type: 'OUT',
      quantity: item.quantity,
      reason: 'SALE',
      reference_id: inserted.id
    }));

    await supabaseServer.from("inventory_movements").insert(movementsPayload);
  }

  return inserted as SaleRecord;
}
