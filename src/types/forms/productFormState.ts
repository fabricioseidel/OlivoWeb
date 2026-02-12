import type { ToastType } from "@/components/ui/Toast";

export type ProductFormState = {
  errors?: Partial<Record<"nombre" | "categoria" | "descripcion" | "precio" | "stock", string[]>>;
  message?: string | null;
  ok?: boolean;
  toastMessage?: string;
  toastType?: ToastType;
};
