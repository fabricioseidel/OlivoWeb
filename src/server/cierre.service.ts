import { supabaseServer } from "@/lib/supabase-server";
import type { CierrePayload, CierreResumen, CustomerBalance } from "@/lib/cierre/types";

/**
 * Lado computador del cierre declarado: revisar, corregir e imprimir el mes.
 *
 * El cierre del día se hace en el POS desde el celular. Acá sólo se lee y se
 * corrige. El cálculo vive completo en el RPC `registrar_cierre` de Postgres,
 * no en TypeScript: este repo y el del POS apuntan a la misma base, y cuando
 * la lógica de caja se escribió en los dos terminó divergiendo.
 */

export interface CierreListado {
  id: string;
  business_date: string;
  branch_id: string | null;
  started_at: string;
  ended_at: string | null;
  starting_cash: number;
  actual_cash: number | null;
  is_declared: boolean;
  notes: string | null;
  declared_totals: CierreResumen["shift"]["declared_totals"];
  pos_totals: Record<string, number> | null;
}

export async function listarCierres(opts: {
  branchId?: string | null;
  desde?: string;
  hasta?: string;
  limite?: number;
}): Promise<CierreListado[]> {
  let query = supabaseServer
    .from("cash_shifts")
    .select(
      "id, business_date, branch_id, started_at, ended_at, starting_cash, actual_cash, is_declared, notes, declared_totals, pos_totals"
    )
    .eq("status", "CLOSED")
    // Sólo cierres declarados: los turnos anteriores a este sistema se
    // cerraron sin desglose y aparecerían como días de $0 junto a los reales,
    // tanto en la tabla del mes como en el PDF del cuaderno contable.
    .eq("is_declared", true)
    .order("business_date", { ascending: true })
    .limit(opts.limite ?? 200);

  if (opts.branchId) query = query.eq("branch_id", opts.branchId);
  if (opts.desde) query = query.gte("business_date", opts.desde);
  if (opts.hasta) query = query.lte("business_date", opts.hasta);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as CierreListado[];
}

export async function obtenerResumen(shiftId: string): Promise<CierreResumen | null> {
  const { data, error } = await supabaseServer.rpc("resumen_cierre", { p_shift_id: shiftId });
  if (error) throw new Error(error.message);
  return (data as CierreResumen) ?? null;
}

/** Reenvía un cierre corregido. El RPC es idempotente: reemplaza, no duplica. */
export async function corregirCierre(
  shiftId: string,
  payload: CierrePayload
): Promise<CierreResumen> {
  const { data, error } = await supabaseServer.rpc("registrar_cierre", {
    p_shift_id: shiftId,
    p_payload: payload,
  });
  if (error) throw new Error(`No se pudo corregir el cierre: ${error.message}`);
  return data as CierreResumen;
}

export async function listarCuentas(soloConDeuda = false): Promise<CustomerBalance[]> {
  let query = supabaseServer
    .from("v_customer_balances")
    .select("*")
    .order("balance", { ascending: false });
  if (soloConDeuda) query = query.gt("balance", 0);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as CustomerBalance[];
}

export async function movimientosDeCuenta(accountId: string) {
  const { data, error } = await supabaseServer
    .from("account_entries")
    .select("id, kind, amount, occurred_on, method, note, shift_id, created_at")
    .eq("account_id", accountId)
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

/**
 * Cargo o abono suelto, fuera del cierre del día.
 *
 * Queda sin `shift_id` a propósito: no pasó por ningún arqueo, así que no
 * mueve los totales de ningún día. Sirve para corregir la historia (un fiado
 * viejo que faltaba, un pago que se anotó mal), no para registrar plata que
 * entró hoy — eso va en el cierre, o la caja de ese día no cuadra.
 */
export async function registrarMovimientoCuenta(input: {
  accountId?: string | null;
  name?: string;
  kind: "CHARGE" | "PAYMENT";
  amount: number;
  occurredOn: string;
  method?: string | null;
  note?: string | null;
}) {
  let accountId = input.accountId ?? null;

  if (!accountId) {
    const { data, error } = await supabaseServer.rpc("find_or_create_account", {
      p_name: input.name ?? "",
    });
    if (error) throw new Error(error.message);
    accountId = data as string;
  }

  const { error } = await supabaseServer.from("account_entries").insert({
    account_id: accountId,
    shift_id: null,
    kind: input.kind,
    amount: input.amount,
    occurred_on: input.occurredOn,
    method: input.kind === "PAYMENT" ? (input.method ?? "CASH") : null,
    note: input.note ?? null,
  });

  if (error) throw new Error(error.message);
  return { accountId };
}
