/**
 * Tipos del cierre declarado.
 *
 * "Declarado" significa que el cajero escribe lo que hubo y eso es la verdad
 * del día. Mientras el POS no se use para todas las ventas no existe una
 * fuente independiente contra la cual cuadrar, así que fingir un "esperado"
 * sólo produciría descuadres falsos todos los días.
 */

export interface DenominationCount {
  denomination: number;
  quantity: number;
}

export interface TransferInput {
  amount: number;
  payer?: string;
  reference?: string;
  note?: string;
}

/** Un cierre de terminal (el papel que escupe la máquina). */
export interface VoucherInput {
  terminal_code?: string;
  closed_at?: string | null;
  credit_count?: number;
  credit_amount?: number;
  debit_count?: number;
  debit_amount?: number;
  prepaid_count?: number;
  prepaid_amount?: number;
  cash_count?: number;
  cash_amount?: number;
  /** El total impreso en el papel, tal cual. No se recalcula a propósito. */
  total_amount: number;
  notes?: string;
}

/** Mercadería que se llevó alguien sin pagar. No entra plata a la caja. */
export interface FiadoInput {
  account_id?: string | null;
  name: string;
  amount: number;
  note?: string;
}

/** Pago de una deuda vieja. Entra plata, pero NO es venta de hoy. */
export interface AbonoInput {
  account_id?: string | null;
  name: string;
  amount: number;
  method: "CASH" | "TRANSFER" | "CARD";
  note?: string;
}

export interface CierrePayload {
  business_date?: string;
  notes?: string;
  denominations?: DenominationCount[];
  /** Sólo se usa si no hubo conteo por denominación. */
  cash_counted?: number;
  transfers?: TransferInput[];
  vouchers?: VoucherInput[];
  fiados?: FiadoInput[];
  abonos?: AbonoInput[];
}

export interface MethodTotals {
  bruto?: number;
  contado?: number;
  inicial?: number;
  ingresos?: number;
  egresos?: number;
  abonos: number;
  ventas: number;
}

export interface DeclaredTotals {
  CASH: MethodTotals;
  TRANSFER: MethodTotals;
  CARD: MethodTotals;
  fiados_otorgados: number;
  abonos_recibidos: number;
  total_ventas: number;
}

export interface CierreResumen {
  shift: {
    id: string;
    branch_id: string | null;
    business_date: string;
    started_at: string;
    ended_at: string | null;
    starting_cash: number;
    actual_cash: number | null;
    status: "OPEN" | "CLOSED";
    is_declared: boolean;
    notes: string | null;
    declared_totals: DeclaredTotals | null;
    pos_totals: Record<string, number> | null;
  };
  branch: string | null;
  denominations: Array<DenominationCount & { subtotal: number }>;
  transfers: Array<{ id: string; amount: number; payer: string | null; reference: string | null }>;
  vouchers: Array<{
    id: string;
    terminal_code: string | null;
    closed_at: string | null;
    credit_amount: number;
    debit_amount: number;
    prepaid_amount: number;
    cash_amount: number;
    total_amount: number;
    parts_total: number;
    notes: string | null;
  }>;
  movements: Array<{ id: string; amount: number; type: "IN" | "OUT"; method: string; reason: string }>;
  account_entries: Array<{
    id: string;
    kind: "CHARGE" | "PAYMENT";
    amount: number;
    method: string | null;
    name: string;
    note: string | null;
  }>;
  balances: Array<{ id: string; name: string; balance: number; oldest_charge: string | null }>;
}

export interface CustomerBalance {
  id: string;
  name: string;
  phone: string | null;
  balance: number;
  total_charges: number;
  total_payments: number;
  last_movement: string | null;
  oldest_charge: string | null;
}
