"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  TicketIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
  CheckCircleIcon,
  ClipboardDocumentIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  PauseCircleIcon,
  ClockIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";
import { useToast } from "@/contexts/ToastContext";
import {
  PageShell,
  HeroHeader,
  StatsRow,
  StatsCard,
  FilterChips,
  EmptyState,
} from "@/components/admin/shell";

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
  { value: "fixed_amount", label: "Monto fijo ($)" },
  { value: "free_shipping", label: "Envío gratis" },
];

const FILTER_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "active", label: "Activos" },
  { value: "inactive", label: "Pausados" },
  { value: "expired", label: "Expirados" },
];

const isExpired = (c: Coupon) =>
  c.valid_until ? new Date(c.valid_until) < new Date() : false;

const emptyForm = {
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
};

export default function CuponesPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const { showToast } = useToast();

  const [form, setForm] = useState(emptyForm);

  const loadCoupons = useCallback(async () => {
    setLoading(true);
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
    for (let i = 0; i < 5; i++)
      code += chars[Math.floor(Math.random() * chars.length)];
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
        setForm(emptyForm);
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
      showToast(
        coupon.is_active ? "Cupón pausado" : "Cupón reactivado",
        "success"
      );
      loadCoupons();
    } catch {
      showToast("Error al actualizar", "error");
    }
  };

  const deleteCoupon = async (id: number) => {
    if (!confirm("¿Eliminar este cupón? Esta acción no se puede deshacer."))
      return;
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

  const stats = useMemo(() => {
    const total = coupons.length;
    const active = coupons.filter((c) => c.is_active && !isExpired(c)).length;
    const expired = coupons.filter(isExpired).length;
    const totalUses = coupons.reduce((sum, c) => sum + (c.uses_count || 0), 0);
    return { total, active, expired, totalUses };
  }, [coupons]);

  const filtered = useMemo(() => {
    let arr = coupons;
    if (statusFilter !== "all") {
      arr = arr.filter((c) => {
        if (statusFilter === "active") return c.is_active && !isExpired(c);
        if (statusFilter === "inactive") return !c.is_active;
        if (statusFilter === "expired") return isExpired(c);
        return true;
      });
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      arr = arr.filter(
        (c) =>
          c.code.toLowerCase().includes(q) ||
          c.name.toLowerCase().includes(q) ||
          (c.description || "").toLowerCase().includes(q)
      );
    }
    return arr.sort((a, b) => {
      // Activos primero, luego por más usados
      const aActive = a.is_active && !isExpired(a) ? 1 : 0;
      const bActive = b.is_active && !isExpired(b) ? 1 : 0;
      if (aActive !== bActive) return bActive - aActive;
      return (b.uses_count || 0) - (a.uses_count || 0);
    });
  }, [coupons, search, statusFilter]);

  const formatDiscount = (c: Coupon) => {
    if (c.discount_type === "percentage") return `${c.discount_value}%`;
    if (c.discount_type === "free_shipping") return "Envío gratis";
    return `$${c.discount_value.toLocaleString("es-CL")}`;
  };

  const formatDiscountSubtitle = (c: Coupon) => {
    if (c.discount_type === "free_shipping") return "Sin cargo por delivery";
    if (c.discount_type === "percentage") return "de descuento";
    return "de descuento fijo";
  };

  const filterChipsOptions = FILTER_OPTIONS.map((opt) => ({
    ...opt,
    count:
      opt.value === "all"
        ? coupons.length
        : opt.value === "active"
        ? stats.active
        : opt.value === "inactive"
        ? coupons.filter((c) => !c.is_active).length
        : stats.expired,
  }));

  return (
    <PageShell
      hero={
        <HeroHeader
          kicker="Marketing"
          title="Cupones de descuento"
          subtitle="Creá y gestioná códigos de descuento para impulsar ventas"
          icon={<TicketIcon className="w-6 h-6 text-emerald-300" />}
          right={
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 rounded-xl text-emerald-950 text-xs font-black uppercase tracking-widest hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 min-h-[36px]"
            >
              <PlusIcon className="h-4 w-4" />
              Nuevo cupón
            </button>
          }
        />
      }
    >
      <StatsRow cols={4}>
        <StatsCard
          label="Total"
          value={stats.total.toLocaleString()}
          tone="default"
          icon={<TicketIcon className="w-4 h-4" />}
        />
        <StatsCard
          label="Activos"
          value={stats.active.toLocaleString()}
          tone="emerald"
          icon={<CheckCircleIcon className="w-4 h-4" />}
        />
        <StatsCard
          label="Expirados"
          value={stats.expired.toLocaleString()}
          tone="rose"
          icon={<ClockIcon className="w-4 h-4" />}
        />
        <StatsCard
          label="Canjes totales"
          value={stats.totalUses.toLocaleString()}
          tone="sky"
          icon={<ChartBarIcon className="w-4 h-4" />}
        />
      </StatsRow>

      <div className="bg-white p-4 rounded-2xl ring-1 ring-gray-200 space-y-3">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por código, nombre o descripción…"
            className="w-full bg-gray-50 border-none rounded-xl pl-9 pr-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <FilterChips
          options={filterChipsOptions}
          value={statusFilter}
          onChange={setStatusFilter}
        />
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="px-6 pt-6 pb-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900">Nuevo cupón</h2>
              <button
                onClick={() => setShowForm(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
                aria-label="Cerrar"
              >
                <XMarkIcon className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto">
              <Field label="Código" required>
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
                    className="flex-1 bg-gray-50 border-none rounded-xl px-3 py-2.5 text-sm font-mono uppercase tracking-wider focus:ring-2 focus:ring-emerald-500"
                    placeholder="OLIVO2026"
                  />
                  <button
                    type="button"
                    onClick={generateCode}
                    className="px-3 py-2 bg-emerald-50 ring-1 ring-emerald-200 text-emerald-700 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-emerald-100 min-h-[44px]"
                  >
                    Generar
                  </button>
                </div>
              </Field>

              <Field label="Nombre" required>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  className="w-full bg-gray-50 border-none rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500"
                  placeholder="Descuento de bienvenida"
                />
              </Field>

              <Field label="Descripción (opcional)">
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  className="w-full bg-gray-50 border-none rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500"
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Tipo">
                  <select
                    value={form.discount_type}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, discount_type: e.target.value }))
                    }
                    className="w-full bg-gray-50 border-none rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500"
                  >
                    {DISCOUNT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Valor">
                  <input
                    type="number"
                    value={form.discount_value}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        discount_value: Number(e.target.value),
                      }))
                    }
                    disabled={form.discount_type === "free_shipping"}
                    className="w-full bg-gray-50 border-none rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Compra mínima ($)">
                  <input
                    type="number"
                    value={form.min_purchase}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        min_purchase: Number(e.target.value),
                      }))
                    }
                    className="w-full bg-gray-50 border-none rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500"
                  />
                </Field>
                <Field label="Descuento máx. ($)">
                  <input
                    type="number"
                    value={form.max_discount}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        max_discount: Number(e.target.value),
                      }))
                    }
                    className="w-full bg-gray-50 border-none rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500"
                    placeholder="0 = sin límite"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Usos máx. totales">
                  <input
                    type="number"
                    value={form.max_uses}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        max_uses: Number(e.target.value),
                      }))
                    }
                    className="w-full bg-gray-50 border-none rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500"
                    placeholder="0 = ilimitado"
                  />
                </Field>
                <Field label="Usos por cliente">
                  <input
                    type="number"
                    value={form.max_uses_per_customer}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        max_uses_per_customer: Number(e.target.value),
                      }))
                    }
                    className="w-full bg-gray-50 border-none rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500"
                  />
                </Field>
              </div>

              <Field label="Válido hasta (opcional)">
                <input
                  type="datetime-local"
                  value={form.valid_until}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, valid_until: e.target.value }))
                  }
                  className="w-full bg-gray-50 border-none rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500"
                />
              </Field>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl min-h-[44px]"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 disabled:opacity-50 min-h-[44px]"
              >
                {saving ? "Guardando..." : "Crear cupón"}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-emerald-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl ring-1 ring-gray-200">
          <EmptyState
            icon={<TicketIcon className="h-7 w-7" />}
            title={
              coupons.length === 0
                ? "Sin cupones creados"
                : "Sin coincidencias"
            }
            description={
              coupons.length === 0
                ? "Creá tu primer cupón para incentivar las ventas."
                : "Probá con otro filtro o término de búsqueda."
            }
            cta={
              coupons.length === 0 ? (
                <button
                  onClick={() => setShowForm(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 min-h-[44px]"
                >
                  <PlusIcon className="h-4 w-4" />
                  Nuevo cupón
                </button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((c) => {
            const expired = isExpired(c);
            const dimmed = !c.is_active || expired;
            const usesPct =
              c.max_uses && c.max_uses > 0
                ? Math.min(100, ((c.uses_count || 0) / c.max_uses) * 100)
                : 0;
            return (
              <div
                key={c.id}
                className={`bg-white rounded-2xl ring-1 p-4 sm:p-5 transition-all ${
                  dimmed
                    ? "ring-gray-200 opacity-70"
                    : "ring-emerald-200 hover:ring-emerald-400 hover:shadow-lg"
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <code className="font-mono text-base sm:text-lg font-black text-emerald-700 tracking-wider truncate">
                        {c.code}
                      </code>
                      <button
                        onClick={() => copyCode(c.code)}
                        className="text-gray-400 hover:text-emerald-600 p-1 shrink-0"
                        title="Copiar código"
                      >
                        <ClipboardDocumentIcon className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="text-sm font-bold text-gray-700 truncate">
                      {c.name}
                    </p>
                    {c.description && (
                      <p className="text-xs text-gray-500 line-clamp-1">
                        {c.description}
                      </p>
                    )}
                  </div>
                  <div
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ring-1 whitespace-nowrap ${
                      expired
                        ? "bg-rose-100 text-rose-700 ring-rose-200"
                        : c.is_active
                        ? "bg-emerald-100 text-emerald-700 ring-emerald-200"
                        : "bg-gray-100 text-gray-500 ring-gray-200"
                    }`}
                  >
                    {expired ? "Expirado" : c.is_active ? "Activo" : "Pausado"}
                  </div>
                </div>

                {/* Discount display destacado */}
                <div
                  className={`rounded-xl p-4 mb-3 text-center ring-1 ${
                    dimmed
                      ? "bg-gray-50 ring-gray-200"
                      : "bg-gradient-to-br from-emerald-50 to-emerald-100/50 ring-emerald-200"
                  }`}
                >
                  <div className="text-3xl font-black text-gray-900 leading-none">
                    {formatDiscount(c)}
                  </div>
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mt-1">
                    {formatDiscountSubtitle(c)}
                  </div>
                </div>

                {/* Progress bar de usos (si tiene límite) */}
                {c.max_uses && c.max_uses > 0 && (
                  <div className="mb-3">
                    <div className="flex justify-between text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                      <span>{c.uses_count} canjes</span>
                      <span>{c.max_uses - c.uses_count} restantes</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          usesPct > 80
                            ? "bg-rose-500"
                            : usesPct > 50
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                        }`}
                        style={{ width: `${usesPct}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Stats grid */}
                <div className="grid grid-cols-3 gap-2 text-center pb-3 border-b border-gray-100">
                  <div>
                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">
                      Canjes
                    </p>
                    <p className="text-sm font-black text-gray-700">
                      {c.uses_count}
                      {c.max_uses ? `/${c.max_uses}` : ""}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">
                      Mín.
                    </p>
                    <p className="text-sm font-black text-gray-700">
                      {c.min_purchase > 0
                        ? `$${c.min_purchase.toLocaleString("es-CL")}`
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">
                      Expira
                    </p>
                    <p
                      className={`text-sm font-black ${
                        expired ? "text-rose-600" : "text-gray-700"
                      }`}
                    >
                      {c.valid_until
                        ? new Date(c.valid_until).toLocaleDateString("es-CL", {
                            day: "2-digit",
                            month: "short",
                          })
                        : "∞"}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-3">
                  <button
                    onClick={() => toggleActive(c)}
                    disabled={expired}
                    className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-colors min-h-[40px] disabled:opacity-50 disabled:cursor-not-allowed ${
                      c.is_active
                        ? "bg-amber-50 text-amber-700 hover:bg-amber-100 ring-1 ring-amber-200"
                        : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 ring-1 ring-emerald-200"
                    }`}
                  >
                    {c.is_active ? (
                      <>
                        <PauseCircleIcon className="h-3.5 w-3.5" />
                        Pausar
                      </>
                    ) : (
                      <>
                        <ArrowPathIcon className="h-3.5 w-3.5" />
                        Activar
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => deleteCoupon(c.id)}
                    className="p-2 rounded-lg bg-rose-50 ring-1 ring-rose-200 text-rose-700 hover:bg-rose-100 min-h-[40px] min-w-[40px] inline-flex items-center justify-center"
                    title="Eliminar"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">
        {label}
        {required && <span className="text-rose-500 ml-0.5">*</span>}
      </span>
      {children}
    </label>
  );
}
