"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { createSaleAction } from "@/actions/sales";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import { useToast } from "@/contexts/ToastContext";
import { QuickSaleFormData, saleSchema } from "@/schemas/sale.schema";

const PAYMENT_OPTIONS = [
  { value: "cash", label: "Efectivo" },
  { value: "card", label: "Tarjeta" },
  { value: "transfer", label: "Transferencia" },
  { value: "mixed", label: "Mixto" },
];

type QuickSaleFormProps = {
  customers: Array<{ id: string; name: string }>;
};

export default function QuickSaleForm({ customers }: QuickSaleFormProps) {
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [serverErrors, setServerErrors] = useState<Record<string, string[]>>();

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    reset,
    watch,
    formState: { errors },
  } = useForm<QuickSaleFormData>({
    resolver: zodResolver(saleSchema) as any,
    defaultValues: {
      customerId: "",
      total: 0,
      paymentMethod: "cash",
      notas: "",
    },
  });

  useEffect(() => {
    if (!serverErrors) return;
    Object.entries(serverErrors).forEach(([field, messages]) => {
      setError(field as keyof QuickSaleFormData, { type: "server", message: messages?.[0] });
    });
  }, [serverErrors, setError]);

  const onSubmit = handleSubmit((values) => {
    setServerErrors(undefined);
    startTransition(async () => {
      const result = await createSaleAction(values);
      if (result?.toastMessage) {
        showToast(result.toastMessage, result.toastType);
      }
      if (result?.ok) {
        reset({ customerId: "", total: 0, paymentMethod: "cash", notas: "" });
        return;
      }
      if (result?.errors) {
        setServerErrors(result.errors);
      }
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <Select
        label="Cliente"
        value={watch("customerId") ?? ""}
        onChange={(value) => setValue("customerId", value)}
        options={[{ value: "", label: "Venta rápida (sin cliente)" }, ...customers.map((c) => ({ value: c.id, label: c.name }))]}
        disabled={isPending || customers.length === 0}
        error={errors.customerId?.toString()}
      />
      <Input
        label="Total"
        type="number"
        min="0"
        step="0.01"
        placeholder="0.00"
        disabled={isPending}
        error={errors.total?.message}
        {...register("total", { valueAsNumber: true })}
      />
      <Select
        label="Método de pago"
        value={watch("paymentMethod")}
        onChange={(value) => setValue("paymentMethod", value as QuickSaleFormData["paymentMethod"])}
        options={PAYMENT_OPTIONS}
        disabled={isPending}
        error={errors.paymentMethod?.toString()}
      />
      <div className="space-y-2">
        <label className="text-sm font-semibold text-gray-700" htmlFor="notas">
          Notas
        </label>
        <textarea
          id="notas"
          className={`min-h-[100px] w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition hover:border-emerald-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/40 ${errors.notas ? "border-red-500 focus:border-red-500 focus:ring-red-500/40" : ""
            }`}
          placeholder="Observaciones del pago o referencias internas."
          disabled={isPending}
          {...register("notas")}
        />
        {errors.notas?.message && <p className="text-sm font-medium text-red-600">{errors.notas.message}</p>}
      </div>
      <div className="flex justify-end">
        <Button type="submit" loading={isPending}>
          Registrar venta
        </Button>
      </div>
    </form>
  );
}
