/**
 * Lo que debería haber en caja por método de pago, igual que lo calcula
 * close_shift en la base: los pagos de cada venta del turno (un pago mixto
 * reparte su monto entre métodos), los ingresos y egresos manuales de cada
 * método, y el fondo inicial sólo en efectivo. Las ventas anuladas no cuentan.
 *
 * Lo usan la pantalla de caja y la de cierre para mostrar el mismo número que
 * quedará guardado al cerrar.
 */

export type PagoVenta = { method: string; amount: number | string };

export type VentaTurno = {
  total: number | string;
  payment_method?: string | null;
  voided?: boolean | null;
  sale_payments?: PagoVenta[] | null;
};

export type MovimientoTurno = { amount: number | string; type: "IN" | "OUT"; method?: string | null };

/** Ventas antiguas sin detalle de pagos: el método único, como texto libre. */
export function metodoLegacy(texto: string | null | undefined): string {
  const t = texto || "";
  if (/cash|efectivo/i.test(t)) return "CASH";
  if (/transfer/i.test(t)) return "TRANSFER";
  // Débito/crédito/billetera colapsan en tarjeta: el extracto bancario no los separa.
  if (/debit|credit|card|tarjeta|wallet|prepago/i.test(t)) return "CARD";
  return "OTHER";
}

export function esperadoPorMetodo(
  fondoInicial: number | string,
  ventas: VentaTurno[],
  movimientos: MovimientoTurno[],
): Record<string, number> {
  const r: Record<string, number> = {};
  const sumar = (m: string, monto: number) => {
    r[m] = (r[m] ?? 0) + monto;
  };

  for (const v of ventas) {
    if (v.voided) continue;
    if (Array.isArray(v.sale_payments) && v.sale_payments.length) {
      for (const p of v.sale_payments) sumar(String(p.method).toUpperCase(), Number(p.amount) || 0);
    } else {
      sumar(metodoLegacy(v.payment_method), Number(v.total) || 0);
    }
  }

  for (const m of movimientos) {
    const monto = Number(m.amount) || 0;
    sumar((m.method || "CASH").toUpperCase(), m.type === "IN" ? monto : -monto);
  }

  sumar("CASH", Number(fondoInicial) || 0);
  return r;
}
