"use server";

import { revalidatePath } from "next/cache";

import { ProductFormData, productSchema } from "@/schemas/product.schema";
import { createProduct, deleteProduct, updateProduct } from "@/server/products.service";
import { ProductFormState } from "@/types/forms/productFormState";

const DASHBOARD_PRODUCTS_PATH = "/dashboard/productos";

function formatUnknownError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "Ocurrió un error inesperado";
}

const validationErrorState: ProductFormState = {
  message: "Revisa los campos marcados e inténtalo de nuevo",
  toastMessage: "Hay errores en el formulario",
  toastType: "error",
};

export async function createProductAction(
  data: ProductFormData,
): Promise<ProductFormState> {
  const parsed = productSchema.safeParse(data);

  if (!parsed.success) {
    return {
      ...validationErrorState,
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await createProduct(parsed.data);
    revalidatePath(DASHBOARD_PRODUCTS_PATH);
    return {
      ok: true,
      toastMessage: "Producto creado con éxito",
      toastType: "success",
    };
  } catch (error) {
    const message = formatUnknownError(error);
    return {
      message,
      toastMessage: message,
      toastType: "error",
    };
  }
}

export async function updateProductAction(
  id: string,
  data: ProductFormData,
): Promise<ProductFormState> {
  if (!id) {
    return {
      message: "El identificador del producto es obligatorio",
      toastMessage: "Falta el ID del producto",
      toastType: "error",
    };
  }

  const parsed = productSchema.safeParse(data);

  if (!parsed.success) {
    return {
      ...validationErrorState,
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await updateProduct(id, parsed.data);
    revalidatePath(DASHBOARD_PRODUCTS_PATH);
    return {
      ok: true,
      toastMessage: "Producto actualizado con éxito",
      toastType: "success",
    };
  } catch (error) {
    const message = formatUnknownError(error);
    return {
      message,
      toastMessage: message,
      toastType: "error",
    };
  }
}

export async function deleteProductAction(
  id: string,
): Promise<ProductFormState> {
  if (!id) {
    return {
      message: "El identificador del producto es obligatorio",
      toastMessage: "Falta el ID del producto",
      toastType: "error",
    };
  }

  try {
    await deleteProduct(id);
    revalidatePath(DASHBOARD_PRODUCTS_PATH);
    return {
      ok: true,
      toastMessage: "Producto eliminado con éxito",
      toastType: "success",
    };
  } catch (error) {
    const message = formatUnknownError(error);
    return {
      message,
      toastMessage: message,
      toastType: "error",
    };
  }
}
