"use server";

import { revalidatePath } from "next/cache";
import { createQuickSale } from "@/server/sales.service";
import type { ToastType } from "@/components/ui/Toast";

type SaleActionState = {
  ok?: boolean;
  toastMessage?: string;
  toastType?: ToastType;
};

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
}): Promise<SaleActionState> {
  try {
    console.log("📦 createSaleAction called with:", JSON.stringify(data, null, 2));
    
    const result = await createQuickSale({
      total: data.total,
      paymentMethod: data.paymentMethod,
      items: data.items,
    });

    console.log("✅ Sale result:", result);

    revalidatePath("/admin/ventas");
    revalidatePath("/admin/pos");
    revalidatePath("/admin/caja");

    return {
      ok: true,
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
