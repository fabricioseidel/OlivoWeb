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
  return inserted as SaleRecord;
}
