"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  TicketIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
  CheckCircleIcon,
  ClipboardDocumentIcon,
} from "@heroicons/react/24/outline";
import OlivoButton from "@/components/OlivoButton";
import { useToast } from "@/contexts/ToastContext";

type Coupon = {
  id: number;
  code: string;
  name: string;
  description?: string;
  discount_type: "percentage" | "fixed_amount" | "free_shipping";
  discount_value: number;
  min_purchase: number;
  max_discount?: number;
  max_uses?: number;
  uses_count: number;
  max_uses_per_customer: number;
  valid_from: string;
  valid_until?: string;
  is_active: boolean;
  created_at: string;
};

const DISCOUNT_TYPES = [
  { value: "percentage", label: "Porcentaje (%)" },
  { value: "fixed_amount", label: "Monto Fijo ($)" },
  { value: "free_shipping", label: "Envío Gratis" },
];

export default function CuponesPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  const [form, setForm] = useState({
    code: "",
    name: "",
    description: "",
    discount_type: "percentage" as string,
    discount_value: 10,
    min_purchase: 0,
    max_discount: 0,
    max_uses: 0,
    max_uses_per_customer: 1,
    valid_until: "",
    is_active: true,
  });

  const loadCoupons = useCallback(async () => {
    try {
      const res = await fetch("/api/coupons");
      if (res.ok) setCoupons(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCoupons();
  }, [loadCoupons]);

  const generateCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "OLIVO";
    for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
    setForm((f) => ({ ...f, code }));
  };

  const handleSubmit = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      showToast("Código y nombre son obligatorios", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          code: form.code.toUpperCase().trim(),
          max_uses: form.max_uses || null,
          max_discount: form.max_discount || null,
          valid_until: form.valid_until || null,
        }),
      });
      if (res.ok) {
        showToast("Cupón creado con éxito", "success");
        setShowForm(false);
        setForm({
          code: "",
          name: "",
          description: "",
          discount_type: "percentage",
          discount_value: 10,
          min_purchase: 0,
          max_discount: 0,
          max_uses: 0,
          max_uses_per_customer: 1,
          valid_until: "",
          is_active: true,
        });
        loadCoupons();
      } else {
        const data = await res.json();
        showToast(data.error || "Error al crear cupón", "error");
      }
    } catch {
      showToast("Error de red", "error");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (coupon: Coupon) => {
    try {
      await fetch("/api/coupons", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: coupon.id, is_active: !coupon.is_active }),
      });
      loadCoupons();
    } catch {
      showToast("Error al actualizar", "error");
    }
  };

  const deleteCoupon = async (id: number) => {
    if (!confirm("¿Eliminar este cupón?")) return;
    try {
      await fetch(`/api/coupons?id=${id}`, { method: "DELETE" });
      showToast("Cupón eliminado", "success");
      loadCoupons();
    } catch {
      showToast("Error al eliminar", "error");
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    showToast(`Código ${code} copiado`, "success");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <TicketIcon className="h-7 w-7 text-emerald-600" />
            Cupones de Descuento
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Crea y gestiona cupones para tus clientes
          </p>
        </div>
        <OlivoButton onClick={() => setShowForm(true)}>
          <PlusIcon className="h-4 w-4 mr-1" /> Nuevo Cupón
        </OlivoButton>
      </div>

      {/* Create Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Nuevo Cupón</h2>
              <button onClick={() => setShowForm(false)}>
                <XMarkIcon className="h-5 w-5 text-slate-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Code */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  Código
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={form.code}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        code: e.target.value.toUpperCase(),
                      }))
                    }
                    className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono uppercase tracking-wider focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    placeholder="OLIVO2026"
                  />
                  <button
                    onClick={generateCode}
                    className="px-3 py-2 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-200"
                  >
                    Generar
                  </button>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  Nombre
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  placeholder="Descuento de bienvenida"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  Descripción (opcional)
                </label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                />
              </div>

              {/* Discount Type + Value */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">
                    Tipo
                  </label>
                  <select
                    value={form.discount_type}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, discount_type: e.target.value }))
                    }
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    {DISCOUNT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">
                    Valor
                  </label>
                  <input
                    type="number"
                    value={form.discount_value}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        discount_value: Number(e.target.value),
                      }))
                    }
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              {/* Min purchase, Max discount */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">
                    Compra mínima ($)
                  </label>
                  <input
                    type="number"
                    value={form.min_purchase}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        min_purchase: Number(e.target.value),
                      }))
                    }
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">
                    Descuento máx. ($)
                  </label>
                  <input
                    type="number"
                    value={form.max_discount}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        max_discount: Number(e.target.value),
                      }))
                    }
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="0 = sin límite"
                  />
                </div>
              </div>

              {/* Max uses, Per customer */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">
                    Usos máx. totales
                  </label>
                  <input
                    type="number"
                    value={form.max_uses}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, max_uses: Number(e.target.value) }))
                    }
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="0 = ilimitado"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">
                    Usos por cliente
                  </label>
                  <input
                    type="number"
                    value={form.max_uses_per_customer}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        max_uses_per_customer: Number(e.target.value),
                      }))
                    }
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              {/* Valid until */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  Válido hasta (opcional)
                </label>
                <input
                  type="datetime-local"
                  value={form.valid_until}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, valid_until: e.target.value }))
                  }
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-900"
              >
                Cancelar
              </button>
              <OlivoButton onClick={handleSubmit} disabled={saving}>
                {saving ? "Guardando..." : "Crear Cupón"}
              </OlivoButton>
            </div>
          </div>
        </div>
      )}

      {/* Coupons List */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500" />
        </div>
      ) : coupons.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <TicketIcon className="h-16 w-16 text-slate-200 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-400">
            Sin cupones creados
          </h3>
          <p className="text-sm text-slate-400 mt-1">
            Crea tu primer cupón para incentivar las ventas
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {coupons.map((c) => (
            <div
              key={c.id}
              className={`bg-white rounded-2xl border-2 p-5 transition-all ${
                c.is_active
                  ? "border-emerald-200 shadow-sm hover:shadow-md"
                  : "border-slate-200 opacity-60"
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-lg font-black text-emerald-700 tracking-wider">
                      {c.code}
                    </span>
                    <button
                      onClick={() => copyCode(c.code)}
                      className="text-slate-400 hover:text-emerald-600"
                    >
                      <ClipboardDocumentIcon className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-sm font-bold text-slate-700">{c.name}</p>
                </div>
                <div
                  className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    c.is_active
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {c.is_active ? "Activo" : "Inactivo"}
                </div>
              </div>

              {/* Discount display */}
              <div className="bg-slate-50 rounded-xl p-3 mb-3">
                <span className="text-2xl font-black text-slate-900">
                  {c.discount_type === "percentage"
                    ? `${c.discount_value}%`
                    : c.discount_type === "free_shipping"
                      ? "Envío Gratis"
                      : `$${c.discount_value.toLocaleString("es-CL")}`}
                </span>
                <span className="text-xs text-slate-500 ml-2">
                  {c.discount_type === "percentage"
                    ? "de descuento"
                    : c.discount_type === "fixed_amount"
                      ? "de descuento"
                      : ""}
                </span>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 text-center mb-3">
                <div>
                  <p className="text-xs text-slate-400 font-bold">Usos</p>
                  <p className="text-sm font-black text-slate-700">
                    {c.uses_count}
                    {c.max_uses ? `/${c.max_uses}` : ""}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-bold">Mín.</p>
                  <p className="text-sm font-black text-slate-700">
                    ${c.min_purchase.toLocaleString("es-CL")}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-bold">Expira</p>
                  <p className="text-sm font-black text-slate-700">
                    {c.valid_until
                      ? new Date(c.valid_until).toLocaleDateString("es-CL")
                      : "∞"}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                <button
                  onClick={() => toggleActive(c)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-colors ${
                    c.is_active
                      ? "bg-amber-50 text-amber-700 hover:bg-amber-100"
                      : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                  }`}
                >
                  <CheckCircleIcon className="h-3.5 w-3.5" />
                  {c.is_active ? "Desactivar" : "Activar"}
                </button>
                <button
                  onClick={() => deleteCoupon(c.id)}
                  className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
