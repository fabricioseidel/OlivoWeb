/**
 * Métodos de pago del POS del local.
 *
 * El sistema de pago de la tienda no distingue débito, crédito ni prepago:
 * cualquier pago con tarjeta bancaria llega al mismo extracto, así que
 * separarlos en el POS sólo genera errores de tipeo y descuadres al cuadrar
 * contra el banco. Se registra un único método TARJETA.
 */

export const PAYMENT_METHODS = ["CASH", "CARD", "TRANSFER"] as const;
export type PosPaymentMethod = (typeof PAYMENT_METHODS)[number];

/** Método interno: compra de personal por cobrar. No entra plata a la caja. */
export const STAFF_CREDIT = "STAFF_CREDIT" as const;

export type SaleMethod = PosPaymentMethod | typeof STAFF_CREDIT;

export const PAYMENT_LABELS: Record<SaleMethod, string> = {
  CASH: "Efectivo",
  CARD: "Tarjeta",
  TRANSFER: "Transferencia",
  STAFF_CREDIT: "Por cobrar (personal)",
};

/**
 * Etiquetas para registros históricos, anteriores a la unificación.
 * Se mantienen sólo para no mostrar códigos crudos en reportes antiguos.
 */
export const LEGACY_PAYMENT_LABELS: Record<string, string> = {
  ...PAYMENT_LABELS,
  DEBIT: "Tarjeta (débito)",
  CREDIT: "Tarjeta (crédito)",
  WALLET: "Tarjeta (billetera)",
  OTHER: "Otro",
};

/** Etiqueta legible de cualquier método, histórico incluido. */
export function paymentLabel(method?: string | null): string {
  if (!method) return "—";
  return LEGACY_PAYMENT_LABELS[method.toUpperCase()] ?? method;
}

/**
 * Normaliza cualquier texto de método a los valores que acepta la base.
 * Débito, crédito y billetera colapsan en CARD por la razón de arriba.
 */
export function normalizePaymentMethod(m?: string | null): SaleMethod {
  if (!m) return "CASH";
  const l = m.toLowerCase();
  if (/staff|personal|por.?cobrar/.test(l)) return STAFF_CREDIT;
  if (/cash|efectivo/.test(l)) return "CASH";
  if (/transfer/.test(l)) return "TRANSFER";
  if (/card|tarjeta|debit|debito|débito|credit|credito|crédito|wallet|prepago|mercadopago/.test(l)) {
    return "CARD";
  }
  return "CASH";
}

/** ¿Este método significa que entró dinero al arqueo de caja? */
export function cuentaEnArqueo(method: string): boolean {
  return normalizePaymentMethod(method) !== STAFF_CREDIT;
}

// ── Compra de personal ──────────────────────────────────────────────────
/** Descuento fijo sobre el precio de venta para compras del personal. */
export const STAFF_DISCOUNT_RATE = 0.25;

/** Aplica el descuento de personal a un monto, redondeando a peso. */
export function aplicarDescuentoPersonal(monto: number): number {
  return Math.round(monto * (1 - STAFF_DISCOUNT_RATE));
}
