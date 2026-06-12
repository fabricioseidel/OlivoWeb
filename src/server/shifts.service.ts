import { supabaseServer } from "@/lib/supabase-server";
import { logger } from "@/utils/logger";

export type ShiftStatus = 'OPEN' | 'CLOSED';

export type ShiftPaymentMethod = "CASH" | "DEBIT" | "CREDIT" | "TRANSFER" | "WALLET" | "OTHER";

export interface ShiftMethodBreakdown {
  expected: number;
  actual: number;
  difference: number;
}

export interface CashShift {
  id: string;
  seller_id?: string | null;
  user_id?: string | null;
  branch_id?: string | null;
  started_at: string;
  ended_at?: string | null;
  starting_cash: number;
  expected_cash: number;
  actual_cash?: number | null;
  difference?: number | null;
  status: ShiftStatus;
  notes?: string | null;
  auto_close_at?: string | null;
  closed_by_method?: Record<string, ShiftMethodBreakdown> | null;
}

export async function openShift(data: {
  starting_cash: number;
  seller_id?: string;
  user_id?: string;
  branch_id?: string | null;
  notes?: string;
  auto_close_at?: string | null;
}): Promise<CashShift> {
  const { data: shift, error } = await supabaseServer
    .from("cash_shifts")
    .insert({
      starting_cash: data.starting_cash,
      expected_cash: data.starting_cash,
      ...(data.seller_id ? { seller_id: data.seller_id } : {}),
      ...(data.user_id ? { user_id: data.user_id } : {}),
      ...(data.branch_id ? { branch_id: data.branch_id } : {}),
      ...(data.auto_close_at ? { auto_close_at: data.auto_close_at } : {}),
      status: 'OPEN',
      notes: data.notes
    })
    .select("*")
    .single();

  if (error) {
    logger.error("DB openShift Error:", error);
    throw error;
  }
  return shift;
}

/**
 * Cierra un turno usando el RPC `close_shift` que calcula el cuadre por
 * método de pago (CASH, DEBIT, CREDIT, TRANSFER, WALLET, OTHER) comparando
 * sale_payments + cash_movements contra los conteos físicos.
 *
 * `counts` es un objeto con el monto contado por método: { CASH: 50000, DEBIT: 12000 }.
 * Si solo se pasa CASH, el método legacy sigue funcionando.
 */
export async function closeShift(
  shiftId: string,
  counts: Partial<Record<ShiftPaymentMethod, number>> | number,
  notes?: string
): Promise<CashShift & { breakdown?: Record<string, ShiftMethodBreakdown> }> {
  // Backward compat: si pasan un número, lo tratamos como conteo de CASH
  const countsObj: Partial<Record<ShiftPaymentMethod, number>> =
    typeof counts === "number" ? { CASH: counts } : counts;

  const { data: breakdown, error: rpcError } = await supabaseServer.rpc("close_shift", {
    p_shift_id: shiftId,
    p_counts: countsObj,
  });

  if (rpcError) throw new Error(`close_shift falló: ${rpcError.message}`);

  // Opcional: persistir notas si vienen
  if (notes) {
    await supabaseServer.from("cash_shifts").update({ notes }).eq("id", shiftId);
  }

  const { data: closed, error: fetchError } = await supabaseServer
    .from("cash_shifts").select("*").eq("id", shiftId).single();
  if (fetchError) throw fetchError;

  return { ...(closed as CashShift), breakdown: breakdown as Record<string, ShiftMethodBreakdown> };
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
