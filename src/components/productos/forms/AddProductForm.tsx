"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { createProductAction } from "@/actions/products";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useToast } from "@/contexts/ToastContext";
import { ProductFormData, productSchema } from "@/schemas/product.schema";
import { ProductFormState } from "@/types/forms/productFormState";

const DEFAULT_VALUES: ProductFormData = {
  nombre: "",
  categoria: "",
  descripcion: "",
  precio: 0,
  stock: 0,
  isActive: true,
  isFeatured: false,
};

export default function AddProductForm() {
  const router = useRouter();
  const { showToast } = useToast();
  const [serverState, setServerState] = useState<ProductFormState>();
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema) as any,
    defaultValues: useMemo(() => ({ ...DEFAULT_VALUES }), []),
  });

  useEffect(() => {
    if (!serverState?.errors) return;
    Object.entries(serverState.errors).forEach(([field, messages]) => {
      const message = messages?.[0];
      if (!message) return;
      setError(field as keyof ProductFormData, { type: "server", message });
    });
  }, [serverState?.errors, setError]);

  useEffect(() => {
    if (serverState?.toastMessage) {
      showToast(serverState.toastMessage, serverState.toastType);
    }
  }, [serverState?.toastMessage, serverState?.toastType, showToast]);

  const onSubmit = handleSubmit((values) => {
    setServerState(undefined);
    startTransition(async () => {
      const result = await createProductAction(values);
      setServerState(result);

      if (result?.ok) {
        reset({ ...DEFAULT_VALUES });
        router.push("/dashboard/productos");
        router.refresh();
      }
    });
  });

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-6 rounded-lg border border-muted-foreground/20 bg-white p-6 shadow-sm"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Input
          label="Nombre"
          placeholder="Nombre del producto"
          disabled={isPending}
          error={errors.nombre?.message}
          {...register("nombre")}
        />
        <Input
          label="Categoria"
          placeholder="Categoria principal"
          disabled={isPending}
          error={errors.categoria?.message}
          {...register("categoria")}
        />
        <Input
          type="number"
          step="0.01"
          min="0"
          label="Precio"
          placeholder="0.00"
          disabled={isPending}
          error={errors.precio?.message}
          {...register("precio", { valueAsNumber: true })}
        />
        <Input
          type="number"
          min="0"
          label="Stock"
          placeholder="0"
          disabled={isPending}
          error={errors.stock?.message}
          {...register("stock", { valueAsNumber: true })}
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-semibold text-gray-700" htmlFor="descripcion">
          Descripcion
        </label>
        <textarea
          id="descripcion"
          placeholder="Notas para el equipo interno o ficha publica"
          className={`min-h-[120px] w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition hover:border-emerald-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/40 ${errors.descripcion ? "border-red-500 focus:border-red-500 focus:ring-red-500/40" : ""
            }`}
          disabled={isPending}
          {...register("descripcion")}
        />
        {errors.descripcion?.message && (
          <p className="text-sm font-medium text-red-600">{errors.descripcion.message}</p>
        )}
      </div>
      {serverState?.message && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" aria-live="assertive">
          {serverState.message}
        </p>
      )}
      <div className="flex justify-end gap-3">
        <Button type="submit" loading={isPending}>
          Guardar producto
        </Button>
      </div>
    </form>
  );
}
