import { supabaseServer } from "@/lib/supabase-server";
import { earnPoints } from "@/server/loyalty.service";
import { logger } from "@/utils/logger";

/**
 * Métodos aceptados por la base (enum payment_method).
 * CARD unifica débito/crédito/prepago; STAFF_CREDIT es la compra de personal
 * por cobrar, que no entra al arqueo. DEBIT/CREDIT/WALLET se conservan sólo
 * porque existen en registros históricos.
 */
export type SalePaymentMethod =
  | "CASH"
  | "CARD"
  | "TRANSFER"
  | "STAFF_CREDIT"
  | "DEBIT"
  | "CREDIT"
  | "WALLET"
  | "OTHER";

export interface SalePaymentInput {
  method: SalePaymentMethod;
  amount: number;
  reference?: string | null;
}

export interface CreateSaleInput {
  branchId?: string | null;
  shiftId?: string | null;
  total: number;
  discount?: number;
  tax?: number;
  notes?: string;
  cashReceived?: number;
  changeGiven?: number;
  sellerName?: string;
  /** Vendedor autenticado, para asociar compras de personal. */
  sellerId?: string | null;
  /** Compra de personal (descuento fijo, asociada al vendedor). */
  isStaffPurchase?: boolean;
  /** Tasa de descuento del personal vigente al registrar la venta. */
  staffDiscountRate?: number;
  customerEmail?: string;
  transferReceiptUri?: string;
  transferReceiptName?: string;
  clientSaleId?: string;
  payments: SalePaymentInput[];
  items: Array<{
    barcode: string;
    name?: string;
    qty: number;
    unit_price: number;
    subtotal: number;
    discount?: number;
  }>;
}

/**
 * Crea una venta usando el RPC apply_sale: una sola transacción que inserta
 * sales + sale_items + sale_payments, decrementa branch_stock, mantiene
 * products.stock en sync y registra inventory_movements (OUT) por ítem.
 *
 * Soporta pago mixto (varios SalePaymentInput sumando el total) y respeta
 * branchId / shiftId. Idempotente vía clientSaleId.
 */
export async function createSale(input: CreateSaleInput): Promise<{ id: number }> {
  const clientSaleId = input.clientSaleId ?? `web-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  // Validación rápida: suma de pagos debe coincidir con el total
  const paymentSum = input.payments.reduce((acc, p) => acc + Number(p.amount), 0);
  if (Math.abs(paymentSum - input.total) > 0.01) {
    throw new Error(`Suma de pagos ($${paymentSum}) no coincide con el total ($${input.total})`);
  }

  // Payment method principal (para sales.payment_method legacy)
  const primary = input.payments[0]?.method?.toLowerCase() ?? "cash";

  const { data, error } = await supabaseServer.rpc("apply_sale", {
    p_total: input.total,
    p_payment_method: primary,
    p_cash_received: input.cashReceived ?? 0,
    p_change_given: input.changeGiven ?? 0,
    p_discount: input.discount ?? 0,
    p_tax: input.tax ?? 0,
    p_notes: input.notes ?? null,
    p_device_id: "web",
    p_client_sale_id: clientSaleId,
    p_items: input.items.map((it) => ({
      barcode: it.barcode,
      name: it.name ?? "Producto",
      qty: it.qty,
      unit_price: it.unit_price,
      subtotal: it.subtotal,
      discount: it.discount ?? 0,
    })),
    p_seller_name: input.sellerName ?? null,
    p_transfer_receipt_uri: input.transferReceiptUri ?? null,
    p_transfer_receipt_name: input.transferReceiptName ?? null,
    p_branch_id: input.branchId ?? null,
    p_payments: input.payments.map((p) => ({
      method: p.method,
      amount: p.amount,
      reference: p.reference ?? null,
    })),
    p_shift_id: input.shiftId ?? null,
  });

  if (error) throw new Error(`apply_sale falló: ${error.message}`);
  const saleId = Number(data);
  if (!Number.isFinite(saleId) || saleId <= 0) {
    throw new Error("apply_sale no devolvió un id válido");
  }

  // seller_id e is_staff_purchase se marcan aparte: la RPC apply_sale es
  // compartida con la app y el POS offline, así que se deja intacta.
  if (input.sellerId || input.isStaffPurchase) {
    const { error: markErr } = await supabaseServer
      .from("sales")
      .update({
        ...(input.sellerId ? { seller_id: input.sellerId } : {}),
        ...(input.isStaffPurchase ? { is_staff_purchase: true } : {}),
        ...(input.staffDiscountRate !== undefined
          ? { staff_discount_rate: input.staffDiscountRate }
          : {}),
      })
      .eq("id", saleId);
    if (markErr) {
      // No revierte la venta: ya está registrada y el stock descontado.
      console.error("[sales] no se pudo marcar seller_id/compra propia:", markErr.message);
    }
  }

  // Loyalty points (no-crítico)
  if (input.customerEmail) {
    try {
      await earnPoints({
        customerEmail: input.customerEmail,
        amount: input.total,
        referenceType: "sale",
        referenceId: String(saleId),
      });
    } catch (e) {
      logger.warn("loyalty points (no-crítico):", e);
    }
  }

  return { id: saleId };
}

