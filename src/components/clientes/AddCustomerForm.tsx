"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { createCustomerAction } from "@/actions/customers";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import { useToast } from "@/contexts/ToastContext";
import { CustomerFormData, customerSchema } from "@/schemas/customer.schema";

const CUSTOMER_TYPES = [
  { value: "regular", label: "Regular" },
  { value: "vip", label: "VIP" },
  { value: "mayorista", label: "Mayorista" },
];

export default function AddCustomerForm() {
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [serverErrors, setServerErrors] = useState<Record<string, string[]>>();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    watch,
    formState: { errors },
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema) as any,
    defaultValues: {
      nombre: "",
      email: "",
      telefono: "",
      tipo: "regular",
      notas: "",
    },
  });

  useEffect(() => {
    if (!serverErrors) return;
    Object.entries(serverErrors).forEach(([field, messages]) => {
      setError(field as keyof CustomerFormData, { type: "server", message: messages?.[0] });
    });
  }, [serverErrors, setError]);

  const onSubmit = handleSubmit((values) => {
    setServerErrors(undefined);
    startTransition(async () => {
      const result = await createCustomerAction(values);
      if (result?.toastMessage) {
        showToast(result.toastMessage, result.toastType);
      }
      if (result?.ok) {
        reset({ ...values, nombre: "", email: "", telefono: "", notas: "" });
        return;
      }
      if (result?.errors) {
        setServerErrors(result.errors);
      }
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="grid gap-4 md:grid-cols-2">
        <Input
          label="Nombre"
          placeholder="Ej. Juan Pérez"
          disabled={isPending}
          error={errors.nombre?.message}
          {...register("nombre")}
        />
        <Input
          label="Email"
          type="email"
          placeholder="cliente@correo.com"
          disabled={isPending}
          error={errors.email?.message}
          {...register("email")}
        />
        <Input
          label="Teléfono"
          placeholder="+56 9 1234 5678"
          disabled={isPending}
          error={errors.telefono?.message}
          {...register("telefono")}
        />
        <Select
          label="Tipo"
          options={CUSTOMER_TYPES}
          disabled={isPending}
          error={errors.tipo?.message}
          value={watch("tipo")}
          onChange={(value) => {
            const synthetic = { target: { value } };
            register("tipo").onChange(synthetic as any);
          }}
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-semibold text-gray-700" htmlFor="notas">
          Notas
        </label>
        <textarea
          id="notas"
          className={`min-h-[100px] w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition hover:border-emerald-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/40 ${errors.notas ? "border-red-500 focus:border-red-500 focus:ring-red-500/40" : ""
            }`}
          placeholder="Comentarios internos, crédito aprobado, etc."
          disabled={isPending}
          {...register("notas")}
        />
        {errors.notas?.message && <p className="text-sm font-medium text-red-600">{errors.notas.message}</p>}
      </div>
      <div className="flex justify-end">
        <Button type="submit" loading={isPending}>
          Guardar cliente
        </Button>
      </div>
    </form>
  );
}
