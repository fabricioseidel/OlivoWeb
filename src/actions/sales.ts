"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createSale, type SalePaymentInput } from "@/server/sales.service";
import { supabaseServer } from "@/lib/supabase-server";
import type { ToastType } from "@/components/ui/Toast";
import { normalizePaymentMethod, STAFF_CREDIT } from "@/lib/pos/payments";

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
  /** Compra de personal: 25% de descuento, asociada al vendedor que atiende. */
  isStaffPurchase?: boolean;
  /** La compra de personal queda por cobrar y se descuenta del sueldo. */
  staffUnpaid?: boolean;
  /** Tasa de descuento aplicada, guardada para no depender del valor vigente. */
  staffDiscountRate?: number;
  /** Monto de descuento aplicado a la venta. */
  discount?: number;
}

export async function createSaleAction(data: CreateSaleActionInput): Promise<SaleActionState> {
  try {
    const session = await getServerSession(authOptions);
    const sellerName = session?.user?.name || "Web POS";
    const sellerId = (session?.user as { id?: string } | undefined)?.id ?? null;

    if (!data.items?.length) {
      return { ok: false, toastMessage: "Carrito vacío", toastType: "error" };
    }

    // Toda venta debe quedar dentro de un turno de caja abierto. Sin esto, las
    // ventas quedan huérfanas y el arqueo del día no cuadra nunca. Se valida en
    // el servidor a propósito: bloquear sólo la UI no impide el registro.
    const { data: shift } = await supabaseServer
      .from("cash_shifts")
      .select("id")
      .eq("status", "OPEN")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const shiftId: string | null = shift?.id ?? null;
    if (!shiftId) {
      return {
        ok: false,
        toastMessage: "No hay caja abierta. Abre la caja antes de registrar ventas.",
        toastType: "error",
      };
    }

    // Resolver pagos: si vienen explícitos, validar y usarlos. Si no, derivar del método único.
    const payments: SalePaymentInput[] =
      data.payments && data.payments.length > 0
        ? data.payments.map((p) => ({ ...p, method: normalizePaymentMethod(p.method) }))
        : [
            {
              method: data.isStaffPurchase && data.staffUnpaid
                ? STAFF_CREDIT
                : normalizePaymentMethod(data.paymentMethod),
              amount: data.total,
            },
          ];

    const result = await createSale({
      branchId: data.branchId ?? null,
      shiftId,
      total: data.total,
      discount: data.discount ?? 0,
      tax: data.tax ?? 0,
      notes: data.notas,
      cashReceived: data.cashReceived,
      changeGiven: data.changeGiven,
      sellerName,
      sellerId,
      isStaffPurchase: data.isStaffPurchase ?? false,
      staffDiscountRate: data.staffDiscountRate,
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
      toastMessage: data.isStaffPurchase
        ? (data.staffUnpaid
            ? "Compra propia registrada como por cobrar"
            : "Compra propia registrada")
        : "Venta registrada correctamente",
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
