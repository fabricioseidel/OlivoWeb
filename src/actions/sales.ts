"use server";

import { revalidatePath } from "next/cache";
import { createQuickSale } from "@/server/sales.service";
import type { ToastType } from "@/components/ui/Toast";

type SaleActionState = {
  ok?: boolean;
  saleId?: string | number;
  toastMessage?: string;
  toastType?: ToastType;
};

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function createSaleAction(data: {
  total: number;
  paymentMethod: string;
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
}): Promise<SaleActionState> {
  try {
    const session = await getServerSession(authOptions);
    const sellerName = session?.user?.name || "Web POS";
    const sellerEmail = session?.user?.email || "";

    console.log("📦 createSaleAction called by:", sellerName, "with:", JSON.stringify(data, null, 2));
    
    const result = await createQuickSale({
      total: data.total,
      paymentMethod: data.paymentMethod,
      items: data.items,
      notas: data.notas,
      cashReceived: data.cashReceived,
      changeGiven: data.changeGiven,
      tax: data.tax,
      sellerName,
      sellerEmail,
      customerEmail: data.customerEmail,
      customerName: data.customerName,
    });

    console.log("✅ Sale result:", result);

    revalidatePath("/admin/ventas");
    revalidatePath("/admin/pos");
    revalidatePath("/admin/caja");

    return {
      ok: true,
      saleId: result.id,
      toastMessage: "Venta registrada correctamente",
      toastType: "success",
    };
  } catch (error: any) {
    console.error("🔥 createSaleAction CRASH:", error);
    const msg = error?.message || "Error desconocido al registrar venta";
    return {
      ok: false,
      toastMessage: msg,
      toastType: "error",
    };
  }
}
