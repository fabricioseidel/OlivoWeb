import { supabaseAdmin } from "@/lib/supabaseAdmin";

export interface ReportSalesRange {
  total: number;
  count: number;
  by_method: Record<string, number>;
  by_day: Array<{ date: string; total: number; count: number }>;
  by_branch: Array<{ branch_id: string | null; branch_name: string | null; total: number; count: number }>;
  top_products: Array<{ barcode: string; name: string; units: number; revenue: number }>;
}

export async function getSalesReport(opts: {
  from: string;
  to: string;
  branchId?: string | null;
}): Promise<ReportSalesRange> {
  const { data, error } = await supabaseAdmin.rpc("report_sales_range", {
    p_from: opts.from,
    p_to: opts.to,
    p_branch_id: opts.branchId ?? null,
  });
  if (error) throw new Error(`report_sales_range falló: ${error.message}`);
  return data as ReportSalesRange;
}

export interface ShiftHistoryRow {
  id: string;
  branch_id: string | null;
  branch_name: string | null;
  started_at: string;
  ended_at: string | null;
  starting_cash: number;
  expected_cash: number;
  actual_cash: number | null;
  difference: number | null;
  status: "OPEN" | "CLOSED";
  notes: string | null;
  closed_by_method: Record<string, { expected: number; actual: number; difference: number }> | null;
  hours_open: number;
}

export async function getShiftsHistory(opts: {
  from?: string;
  to?: string;
  branchId?: string | null;
  limit?: number;
}): Promise<ShiftHistoryRow[]> {
  let q = supabaseAdmin
    .from("v_shifts_history")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(opts.limit ?? 50);

  if (opts.from) q = q.gte("started_at", opts.from);
  if (opts.to)   q = q.lte("started_at", opts.to);
  if (opts.branchId) q = q.eq("branch_id", opts.branchId);

  const { data, error } = await q;
  if (error) throw new Error(`getShiftsHistory falló: ${error.message}`);
  return (data as ShiftHistoryRow[]) ?? [];
}
