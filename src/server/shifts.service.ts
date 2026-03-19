import { supabaseServer } from "@/lib/supabase-server";

export type ShiftStatus = 'OPEN' | 'CLOSED';

export interface CashShift {
  id: string;
  seller_id?: string | null;
  user_id?: string | null;
  started_at: string;
  ended_at?: string | null;
  starting_cash: number;
  expected_cash: number;
  actual_cash?: number | null;
  difference?: number | null;
  status: ShiftStatus;
  notes?: string | null;
}

export async function openShift(data: {
  starting_cash: number;
  seller_id?: string;
  user_id?: string;
  notes?: string;
}): Promise<CashShift> {
  const { data: shift, error } = await supabaseServer
    .from("cash_shifts")
    .insert({
      starting_cash: data.starting_cash,
      expected_cash: data.starting_cash,
      ...(data.seller_id ? { seller_id: data.seller_id } : {}),
      ...(data.user_id ? { user_id: data.user_id } : {}),
      status: 'OPEN',
      notes: data.notes
    })
    .select("*")
    .single();

  if (error) {
    console.error("DB openShift Error:", error);
    throw error;
  }
  return shift;
}

export async function closeShift(shiftId: string, actualCash: number, notes?: string): Promise<CashShift> {
  // First, calculate expected cash before closing
  const { data: shift, error: fetchError } = await supabaseServer
    .from("cash_shifts")
    .select("starting_cash")
    .eq("id", shiftId)
    .single();

  if (fetchError) throw fetchError;

  // Sum cash sales for this shift
  const { data: sales, error: salesError } = await supabaseServer
    .from("sales")
    .select("total")
    .eq("shift_id", shiftId)
    .eq("payment_method", "cash");

  if (salesError) throw salesError;

  // Sum cash movements
  const { data: movements, error: movementsError } = await supabaseServer
    .from("cash_movements")
    .select("amount, type")
    .eq("shift_id", shiftId);

  if (movementsError) throw movementsError;

  const totalSales = sales?.reduce((acc, s) => acc + Number(s.total), 0) || 0;
  const totalIn = movements?.filter(m => m.type === 'IN').reduce((acc, m) => acc + Number(m.amount), 0) || 0;
  const totalOut = movements?.filter(m => m.type === 'OUT').reduce((acc, m) => acc + Number(m.amount), 0) || 0;

  const expectedCash = Number(shift.starting_cash) + totalSales + totalIn - totalOut;
  const difference = actualCash - expectedCash;

  const { data: closedShift, error: closeError } = await supabaseServer
    .from("cash_shifts")
    .update({
      actual_cash: actualCash,
      expected_cash: expectedCash,
      difference: difference,
      status: 'CLOSED',
      ended_at: new Date().toISOString(),
      notes: notes
    })
    .eq("id", shiftId)
    .select("*")
    .single();

  if (closeError) throw closeError;
  return closedShift;
}

export async function getCurrentShift(sellerId?: string): Promise<CashShift | null> {
  const query = supabaseServer
    .from("cash_shifts")
    .select("*")
    .eq("status", "OPEN")
    .order("started_at", { ascending: false });

  if (sellerId) {
    query.eq("seller_id", sellerId);
  }

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data;
}

export async function addCashMovement(data: {
  shift_id: string;
  amount: number;
  type: 'IN' | 'OUT';
  reason: string;
}) {
  const { error } = await supabaseServer
    .from("cash_movements")
    .insert(data);

  if (error) throw error;
}
