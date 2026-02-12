"use server";

import { revalidatePath } from "next/cache";

import { QuickSaleFormData, saleSchema } from "@/schemas/sale.schema";
import { createQuickSale } from "@/server/sales.service";
import type { ToastType } from "@/components/ui/Toast";

const DASHBOARD_SALES_PATH = "/dashboard/ventas";

type SaleActionState = {
  errors?: Partial<Record<"customerId" | "total" | "paymentMethod" | "notas", string[]>>;
  message?: string | null;
  ok?: boolean;
  toastMessage?: string;
  toastType?: ToastType;
};

const validationErrorState: SaleActionState = {
  message: "Corrige los errores e inténtalo nuevamente",
  toastMessage: "Revisa el formulario de venta",
  toastType: "error",
};

function formatError(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Ocurrió un error inesperado";
}

export async function createSaleAction(data: QuickSaleFormData): Promise<SaleActionState> {
  const parsed = saleSchema.safeParse(data);

  if (!parsed.success) {
    return {
      ...validationErrorState,
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await createQuickSale(parsed.data);
    revalidatePath(DASHBOARD_SALES_PATH);
    return {
      ok: true,
      toastMessage: "Venta registrada correctamente",
      toastType: "success",
    };
  } catch (error) {
    const message = formatError(error);
    return {
      message,
      toastMessage: message,
      toastType: "error",
    };
  }
}
