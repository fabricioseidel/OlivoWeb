"use server";

import { revalidatePath } from "next/cache";

import { customerSchema, CustomerFormData } from "@/schemas/customer.schema";
import { createCustomer } from "@/server/customers.service";
import type { ToastType } from "@/components/ui/Toast";

const DASHBOARD_CUSTOMERS_PATH = "/dashboard/clientes";

type CustomerActionState = {
  errors?: Partial<Record<"nombre" | "email" | "telefono" | "tipo" | "notas", string[]>>;
  message?: string | null;
  ok?: boolean;
  toastMessage?: string;
  toastType?: ToastType;
};

const defaultValidationError: CustomerActionState = {
  message: "Revisa los campos e inténtalo nuevamente",
  toastMessage: "Formulario de cliente con errores",
  toastType: "error",
};

function formatError(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Ocurrió un error inesperado";
}

export async function createCustomerAction(
  data: CustomerFormData,
): Promise<CustomerActionState> {
  const parsed = customerSchema.safeParse(data);

  if (!parsed.success) {
    return {
      ...defaultValidationError,
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await createCustomer(parsed.data);
    revalidatePath(DASHBOARD_CUSTOMERS_PATH);
    return {
      ok: true,
      toastMessage: "Cliente creado con éxito",
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
