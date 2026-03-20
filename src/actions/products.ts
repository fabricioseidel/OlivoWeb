"use server";

import { revalidatePath } from "next/cache";

import { ProductFormData, productSchema } from "@/schemas/product.schema";
import { createProduct, deleteProduct, updateProduct } from "@/server/products.service";
import { uploadImage } from "@/server/cloudinary.service";
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
    const productData = { ...parsed.data };
    
    // Si hay una imagen en base64, subirla a Cloudinary
    if (productData.image && productData.image.startsWith("data:image")) {
      console.log("📸 Subiendo imagen a Cloudinary...");
      const uploadResult = await uploadImage(productData.image);
      productData.image = uploadResult.url;
      console.log("✅ Imagen subida:", productData.image);
    }

    await createProduct(productData);
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
    const productData = { ...parsed.data };

    // 1. Procesar imagen principal
    if (productData.image && productData.image.startsWith("data:image")) {
      console.log("📸 Actualizando imagen principal en Cloudinary...");
      const uploadResult = await uploadImage(productData.image);
      productData.image = uploadResult.url;
    }

    // 2. Procesar galería (si hay imágenes nuevas en base64)
    if (productData.gallery && productData.gallery.length > 0) {
      const updatedGallery = await Promise.all(
        productData.gallery.map(async (img) => {
          if (img.startsWith("data:image")) {
            console.log("📸 Subiendo imagen de galería a Cloudinary...");
            const res = await uploadImage(img);
            return res.url;
          }
          return img;
        })
      );
      productData.gallery = updatedGallery;
    }

    await updateProduct(id, productData);
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
