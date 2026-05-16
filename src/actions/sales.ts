"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createSale, type SalePaymentInput } from "@/server/sales.service";
import { supabaseServer } from "@/lib/supabase-server";
import type { ToastType } from "@/components/ui/Toast";

type SaleActionState = {
  ok?: boolean;
  saleId?: string | number;
  toastMessage?: string;
  toastType?: ToastType;
};

interface CreateSaleActionInput {
  total: number;
  /** Legacy: método único. Se ignora si `payments` viene con datos. */
  paymentMethod?: string;
  /** Pago mixto: lista de pagos cuyos amounts deben sumar `total`. */
  payments?: SalePaymentInput[];
  branchId?: string | null;
  items?: Array<{
    product_id: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    name?: string;
  }>;
  notas?: string;
  cashReceived?: number;
  changeGiven?: number;
  tax?: number;
  customerEmail?: string;
  customerName?: string;
  transferReceiptUri?: string;
  transferReceiptName?: string;
}

const normalizeMethod = (m?: string): SalePaymentInput["method"] => {
  if (!m) return "CASH";
  const l = m.toLowerCase();
  if (/cash|efectivo/.test(l))     return "CASH";
  if (/debit|debito|débito/.test(l)) return "DEBIT";
  if (/credit|credito|crédito/.test(l)) return "CREDIT";
  if (/card|tarjeta/.test(l))      return "CREDIT";
  if (/transfer/.test(l))          return "TRANSFER";
  if (/wallet|mercadopago/.test(l)) return "WALLET";
  return "OTHER";
};

export async function createSaleAction(data: CreateSaleActionInput): Promise<SaleActionState> {
  try {
    const session = await getServerSession(authOptions);
    const sellerName = session?.user?.name || "Web POS";

    if (!data.items?.length) {
      return { ok: false, toastMessage: "Carrito vacío", toastType: "error" };
    }

    // Resolver pagos: si vienen explícitos, validar y usarlos. Si no, derivar del método único.
    const payments: SalePaymentInput[] =
      data.payments && data.payments.length > 0
        ? data.payments
        : [{ method: normalizeMethod(data.paymentMethod), amount: data.total }];

    // Detectar turno activo
    let shiftId: string | null = null;
    try {
      const { data: shift } = await supabaseServer
        .from("cash_shifts")
        .select("id")
        .eq("status", "OPEN")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      shiftId = shift?.id ?? null;
    } catch { /* noop */ }

    const result = await createSale({
      branchId: data.branchId ?? null,
      shiftId,
      total: data.total,
      discount: 0,
      tax: data.tax ?? 0,
      notes: data.notas,
      cashReceived: data.cashReceived,
      changeGiven: data.changeGiven,
      sellerName,
      customerEmail: data.customerEmail,
      transferReceiptUri: data.transferReceiptUri,
      transferReceiptName: data.transferReceiptName,
      payments,
      items: data.items.map((it) => ({
        barcode: it.product_id,
        name: it.name,
        qty: it.quantity,
        unit_price: it.unit_price,
        subtotal: it.total_price,
      })),
    });

    revalidatePath("/admin/ventas");
    revalidatePath("/admin/pos");
    revalidatePath("/admin/caja");
    revalidatePath("/admin/operaciones");

    return {
      ok: true,
      saleId: result.id,
      toastMessage: "Venta registrada correctamente",
      toastType: "success",
    };
  } catch (error: any) {
    console.error("createSaleAction CRASH:", error);
    return {
      ok: false,
      toastMessage: error?.message || "Error desconocido al registrar venta",
      toastType: "error",
    };
  }
}
