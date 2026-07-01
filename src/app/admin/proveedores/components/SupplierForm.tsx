"use client";

import Button from "@/components/ui/Button";
import Field from "./Field";
import { type Supplier } from "../lib";

interface SupplierFormProps {
  form: Partial<Supplier>;
  saving: boolean;
  onFormChange: (field: keyof Supplier, value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onDelete: (supplierId: string) => void;
}

export default function SupplierForm({
  form,
  saving,
  onFormChange,
  onSubmit,
  onDelete,
}: SupplierFormProps) {
  return (
    <div className="bg-white ring-1 ring-gray-200 rounded-2xl shadow-sm p-5 sm:p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-4">
        {form.id ? "Editar proveedor" : "Crear proveedor"}
      </h2>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nombre" required>
            <input
              required
              className="w-full bg-gray-50 border-none rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500"
              value={form.name ?? ""}
              onChange={(e) => onFormChange("name", e.target.value)}
            />
          </Field>
          <Field label="Contacto">
            <input
              className="w-full bg-gray-50 border-none rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500"
              value={form.contact_name ?? ""}
              onChange={(e) => onFormChange("contact_name", e.target.value)}
            />
          </Field>
          <Field label="Teléfono">
            <input
              className="w-full bg-gray-50 border-none rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500"
              value={form.phone ?? ""}
              onChange={(e) => onFormChange("phone", e.target.value)}
            />
          </Field>
          <Field label="WhatsApp">
            <input
              className="w-full bg-gray-50 border-none rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500"
              value={form.whatsapp ?? ""}
              onChange={(e) => onFormChange("whatsapp", e.target.value)}
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              className="w-full bg-gray-50 border-none rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500"
              value={form.email ?? ""}
              onChange={(e) => onFormChange("email", e.target.value)}
            />
          </Field>
          <Field label="Días de despacho">
            <input
              className="w-full bg-gray-50 border-none rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500"
              value={form.dispatch_days ?? ""}
              onChange={(e) =>
                onFormChange("dispatch_days", e.target.value)
              }
              placeholder="Ej: Lunes, Miércoles"
            />
          </Field>
          <Field label="Pedido mínimo">
            <input
              type="number"
              min={0}
              step="0.01"
              className="w-full bg-gray-50 border-none rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500"
              value={form.min_order_amount ?? ""}
              onChange={(e) =>
                onFormChange("min_order_amount", e.target.value)
              }
            />
          </Field>
          <Field label="Tipo de pago">
            <input
              className="w-full bg-gray-50 border-none rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500"
              value={form.payment_type ?? ""}
              onChange={(e) =>
                onFormChange("payment_type", e.target.value)
              }
              placeholder="Ej: Contado, Crédito 30 días"
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Notas">
              <textarea
                rows={3}
                className="w-full bg-gray-50 border-none rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500 resize-none"
                value={form.notes ?? ""}
                onChange={(e) => onFormChange("notes", e.target.value)}
              />
            </Field>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 flex-wrap pt-2 border-t border-gray-100">
          {form.id ? (
            <Button
              type="button"
              variant="danger"
              onClick={() => onDelete(form.id!)}
              disabled={saving}
            >
              Eliminar
            </Button>
          ) : null}
          <Button type="submit" disabled={saving}>
            {saving
              ? "Guardando..."
              : form.id
              ? "Guardar cambios"
              : "Crear proveedor"}
          </Button>
        </div>
      </form>
    </div>
  );
}
