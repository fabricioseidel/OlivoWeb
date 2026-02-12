import { supabaseServer } from "@/lib/supabase-server";
import { CustomerFormData } from "@/schemas/customer.schema";

const CUSTOMERS_TABLE = "customers";

export type CustomerRecord = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  customer_type: string;
  notes?: string | null;
  created_at?: string;
};

function mapFormToRow(data: CustomerFormData) {
  return {
    name: data.nombre,
    email: data.email ?? null,
    phone: data.telefono ?? null,
    customer_type: data.tipo,
    notes: data.notas ?? null,
  };
}

export async function getLatestCustomers(limit = 10): Promise<CustomerRecord[]> {
  const { data, error } = await supabaseServer
    .from(CUSTOMERS_TABLE)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as CustomerRecord[];
}

export async function createCustomer(data: CustomerFormData): Promise<CustomerRecord> {
  const payload = mapFormToRow(data);
  const { data: inserted, error } = await supabaseServer
    .from(CUSTOMERS_TABLE)
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;
  return inserted as CustomerRecord;
}
