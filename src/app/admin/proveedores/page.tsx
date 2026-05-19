"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useProducts } from "@/contexts/ProductContext";
import Button from "@/components/ui/Button";
import { useToast } from "@/contexts/ToastContext";
import {
  TruckIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  ArrowsRightLeftIcon,
  CubeIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import {
  PageShell,
  HeroHeader,
  StatsRow,
  StatsCard,
  EmptyState,
} from "@/components/admin/shell";

type Supplier = {
  id: string;
  name: string;
  contact_name?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  notes?: string | null;
  lead_time_days?: number | null;
  min_order_amount?: number | null;
  dispatch_days?: string | null;
  payment_type?: string | null;
  productCount?: number;
};

type Assignment = {
  id: string;
  product_id: string;
  supplier_id: string;
  priority: number;
  supplier_sku?: string | null;
  pack_size?: number | null;
  unit_cost?: number | null;
  default_reorder_qty?: number | null;
  reorder_threshold?: number | null;
  notes?: string | null;
  supplier?: {
    id: string;
    name: string;
    contact_name?: string | null;
    phone?: string | null;
    whatsapp?: string | null;
    email?: string | null;
  };
};

const emptyForm: Partial<Supplier> = {
  name: "",
  contact_name: "",
  phone: "",
  whatsapp: "",
  email: "",
  notes: "",
  dispatch_days: "",
  payment_type: "",
};

const emptyAssignment = {
  productId: "",
  supplierId: "",
  priceWithVat: "",
  priceWithoutVat: "",
  defaultReorderQty: "",
  notes: "",
};

export default function SuppliersAdminPage() {
  const { products } = useProducts();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Supplier>>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [assignmentForm, setAssignmentForm] = useState<typeof emptyAssignment>(emptyAssignment);
  const [assignmentSaving, setAssignmentSaving] = useState(false);

  const filteredSuppliers = useMemo(() => {
    if (!search.trim()) return suppliers;
    const q = search.trim().toLowerCase();
    return suppliers.filter((supplier) =>
      supplier.name?.toLowerCase().includes(q)
    );
  }, [search, suppliers]);

  const loadSuppliers = useCallback(
    async (currentSearch?: string) => {
      setLoading(true);
      try {
        const qs = currentSearch
          ? `?search=${encodeURIComponent(currentSearch)}`
          : "";
        const res = await fetch(`/api/admin/suppliers${qs}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "No se pudieron cargar los proveedores");
        }
        const data = (await res.json()) as Supplier[];
        setSuppliers(data);
        setSelectedId((prev) => {
          if (prev && data.find((s) => s.id === prev)) return prev;
          return data[0]?.id ?? null;
        });
      } catch (error: any) {
        console.error("[Suppliers] load error:", error);
        showToast(error.message || "Error cargando proveedores", "error");
      } finally {
        setLoading(false);
      }
    },
    [showToast]
  );

  const loadAssignments = useCallback(
    async (supplierId: string) => {
      try {
        setAssignmentSaving(true);
        const res = await fetch(
          `/api/admin/product-suppliers?supplierId=${encodeURIComponent(supplierId)}`
        );
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "No se pudieron cargar los productos");
        }
        const data = (await res.json()) as Assignment[];
        setAssignments(data);
      } catch (error: any) {
        console.error("[Suppliers] assignments error:", error);
        showToast(error.message || "Error cargando productos asociados", "error");
      } finally {
        setAssignmentSaving(false);
      }
    },
    [showToast]
  );

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  useEffect(() => {
    if (selectedId) {
      const supplier = suppliers.find((s) => s.id === selectedId);
      if (supplier) {
        setForm({
          id: supplier.id,
          name: supplier.name,
          contact_name: supplier.contact_name ?? "",
          phone: supplier.phone ?? "",
          whatsapp: supplier.whatsapp ?? "",
          email: supplier.email ?? "",
          notes: supplier.notes ?? "",
          lead_time_days: supplier.lead_time_days ?? undefined,
          min_order_amount: supplier.min_order_amount ?? undefined,
          dispatch_days: supplier.dispatch_days ?? "",
          payment_type: supplier.payment_type ?? "",
        });
        loadAssignments(supplier.id);
        setAssignmentForm({ ...emptyAssignment, supplierId: supplier.id });
      }
    } else {
      setForm(emptyForm);
      setAssignments([]);
    }
  }, [selectedId, suppliers, loadAssignments]);

  const handleFormChange = (field: keyof Supplier, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const payload = {
        name: form.name,
        contactName: form.contact_name,
        phone: form.phone,
        whatsapp: form.whatsapp,
        email: form.email,
        notes: form.notes,
        leadTimeDays:
          (form.lead_time_days as any) != null &&
          (form.lead_time_days as any) !== ""
            ? Number(form.lead_time_days as any)
            : undefined,
        minOrderAmount:
          (form.min_order_amount as any) != null &&
          (form.min_order_amount as any) !== ""
            ? Number(form.min_order_amount as any)
            : undefined,
        dispatchDays: form.dispatch_days,
        paymentType: form.payment_type,
      };

      const method = form.id ? "PATCH" : "POST";
      const url = form.id
        ? `/api/admin/suppliers/${form.id}`
        : "/api/admin/suppliers";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(data.error || "No se pudo guardar el proveedor");
      showToast("Proveedor guardado correctamente", "success");
      await loadSuppliers(search);
      if (!form.id && data?.id) setSelectedId(data.id);
    } catch (error: any) {
      console.error("[Suppliers] save error:", error);
      showToast(error.message || "Error guardando proveedor", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSupplier = async (supplierId: string) => {
    if (!confirm("¿Eliminar este proveedor y sus asignaciones?")) return;
    try {
      setSaving(true);
      const res = await fetch(`/api/admin/suppliers/${supplierId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "No se pudo eliminar el proveedor");
      }
      showToast("Proveedor eliminado", "success");
      setSelectedId((prev) => (prev === supplierId ? null : prev));
      await loadSuppliers(search);
    } catch (error: any) {
      console.error("[Suppliers] delete error:", error);
      showToast(error.message || "Error eliminando proveedor", "error");
    } finally {
      setSaving(false);
    }
  };

  const assignmentProducts = useMemo(
    () => products.slice().sort((a, b) => a.name.localeCompare(b.name)),
    [products]
  );

  const handleAssignmentChange = (field: string, value: string) => {
    setAssignmentForm((prev) => ({ ...prev, [field]: value }));
  };

  const handlePriceCalculation = (field: "with" | "without", value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      setAssignmentForm((prev) => ({
        ...prev,
        priceWithVat: field === "with" ? value : prev.priceWithVat,
        priceWithoutVat: field === "without" ? value : prev.priceWithoutVat,
      }));
      return;
    }
    if (field === "with") {
      const withoutVat = numValue / 1.19;
      setAssignmentForm((prev) => ({
        ...prev,
        priceWithVat: value,
        priceWithoutVat: withoutVat.toFixed(2),
      }));
    } else {
      const withVat = numValue * 1.19;
      setAssignmentForm((prev) => ({
        ...prev,
        priceWithoutVat: value,
        priceWithVat: withVat.toFixed(2),
      }));
    }
  };

  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) return;
    const productId = assignmentForm.productId;
    if (!productId) {
      showToast("Selecciona un producto", "warning");
      return;
    }
    try {
      setAssignmentSaving(true);
      const payload = {
        productId,
        supplierId: selectedId,
        priority: 1,
        unitCost:
          assignmentForm.priceWithoutVat !== ""
            ? Number(assignmentForm.priceWithoutVat)
            : undefined,
        defaultReorderQty:
          assignmentForm.defaultReorderQty !== ""
            ? Number(assignmentForm.defaultReorderQty)
            : undefined,
        notes: assignmentForm.notes || undefined,
      };

      const res = await fetch("/api/admin/product-suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "No se pudo guardar la asignación");
      }
      showToast("Asignación guardada", "success");
      setAssignmentForm({ ...emptyAssignment, supplierId: selectedId });
      await loadAssignments(selectedId);
      await loadSuppliers(search);
    } catch (error: any) {
      console.error("[Suppliers] assignment save error:", error);
      showToast(error.message || "Error guardando asignación", "error");
    } finally {
      setAssignmentSaving(false);
    }
  };

  const handleDeleteAssignment = async (productId: string) => {
    if (!selectedId) return;
    if (!confirm("¿Eliminar la relación con este producto?")) return;
    try {
      setAssignmentSaving(true);
      const res = await fetch("/api/admin/product-suppliers", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, supplierId: selectedId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "No se pudo eliminar la asignación");
      }
      showToast("Asignación eliminada", "success");
      await loadAssignments(selectedId);
      await loadSuppliers(search);
    } catch (error: any) {
      console.error("[Suppliers] assignment delete error:", error);
      showToast(error.message || "Error eliminando asignación", "error");
    } finally {
      setAssignmentSaving(false);
    }
  };

  const stats = useMemo(() => {
    const total = suppliers.length;
    const withProducts = suppliers.filter(
      (s) => (s.productCount ?? 0) > 0
    ).length;
    const totalAssignments = suppliers.reduce(
      (sum, s) => sum + (s.productCount ?? 0),
      0
    );
    const withoutContact = suppliers.filter(
      (s) => !s.whatsapp && !s.phone && !s.email
    ).length;
    return { total, withProducts, totalAssignments, withoutContact };
  }, [suppliers]);

  return (
    <PageShell
      hero={
        <HeroHeader
          kicker="Compras"
          title="Proveedores"
          subtitle="Gestioná proveedores y asigná productos para automatizar pedidos"
          icon={<TruckIcon className="w-6 h-6 text-emerald-300" />}
          right={
            <div className="flex items-center gap-2">
              <Link href="/admin/proveedores/asignar">
                <button className="inline-flex items-center gap-2 px-3 py-2 bg-white/10 ring-1 ring-white/15 rounded-xl text-white text-xs font-black uppercase tracking-widest hover:bg-white/15 transition-all min-h-[36px]">
                  <ArrowsRightLeftIcon className="size-4" />
                  Asignación masiva
                </button>
              </Link>
              <button
                onClick={() => loadSuppliers(search)}
                disabled={loading}
                className="p-2 bg-white/10 ring-1 ring-white/15 rounded-xl text-emerald-100 hover:bg-white/15 transition-colors min-h-[36px]"
                title="Actualizar"
              >
                <ArrowPathIcon
                  className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
              </button>
            </div>
          }
        />
      }
    >
      <StatsRow cols={4}>
        <StatsCard
          label="Proveedores"
          value={stats.total.toLocaleString()}
          tone="default"
          icon={<TruckIcon className="w-4 h-4" />}
        />
        <StatsCard
          label="Con productos"
          value={stats.withProducts.toLocaleString()}
          tone="emerald"
          icon={<CubeIcon className="w-4 h-4" />}
        />
        <StatsCard
          label="Asignaciones"
          value={stats.totalAssignments.toLocaleString()}
          tone="sky"
        />
        <StatsCard
          label="Sin contacto"
          value={stats.withoutContact.toLocaleString()}
          tone="amber"
          hint="Sin teléfono ni email"
        />
      </StatsRow>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Lista de proveedores */}
        <aside className="lg:col-span-1 bg-white ring-1 ring-gray-200 rounded-2xl shadow-sm p-4 space-y-3">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="search"
              placeholder="Buscar proveedor..."
              className="w-full bg-gray-50 border-none rounded-xl pl-9 pr-3 py-2.5 text-sm font-bold focus:ring-2 focus:ring-emerald-500"
              value={search}
              onChange={(e) => {
                const value = e.target.value;
                setSearch(value);
                loadSuppliers(value);
              }}
            />
          </div>

          <button
            type="button"
            onClick={() => {
              setForm(emptyForm);
              setSelectedId(null);
            }}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-100 transition-all min-h-[40px]"
          >
            <PlusIcon className="size-4" />
            Nuevo proveedor
          </button>

          <div className="divide-y divide-gray-100 max-h-[60vh] overflow-y-auto -mx-1 px-1">
            {filteredSuppliers.map((supplier) => (
              <button
                key={supplier.id}
                type="button"
                onClick={() => setSelectedId(supplier.id)}
                className={`w-full text-left px-3 py-3 rounded-lg transition min-h-[44px] ${
                  supplier.id === selectedId
                    ? "bg-emerald-50 ring-1 ring-emerald-200"
                    : "hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-gray-800 truncate">
                    {supplier.name}
                  </span>
                  {supplier.productCount ? (
                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full whitespace-nowrap">
                      {supplier.productCount}
                    </span>
                  ) : null}
                </div>
                {supplier.contact_name ? (
                  <p className="text-xs text-gray-500 mt-1 truncate">
                    {supplier.contact_name}
                  </p>
                ) : null}
                {(supplier.whatsapp || supplier.phone) && (
                  <p className="text-[10px] text-gray-400 mt-0.5 truncate">
                    WhatsApp: {supplier.whatsapp || supplier.phone}
                  </p>
                )}
              </button>
            ))}
            {!filteredSuppliers.length && !loading && (
              <EmptyState
                icon={<TruckIcon className="h-5 w-5" />}
                title="Sin proveedores"
                description="No se encontraron proveedores."
              />
            )}
          </div>
        </aside>

        {/* Form + assignments */}
        <section className="lg:col-span-2 space-y-4">
          <div className="bg-white ring-1 ring-gray-200 rounded-2xl shadow-sm p-5 sm:p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              {form.id ? "Editar proveedor" : "Crear proveedor"}
            </h2>
            <form onSubmit={handleSaveSupplier} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Nombre" required>
                  <input
                    required
                    className="w-full bg-gray-50 border-none rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500"
                    value={form.name ?? ""}
                    onChange={(e) => handleFormChange("name", e.target.value)}
                  />
                </Field>
                <Field label="Contacto">
                  <input
                    className="w-full bg-gray-50 border-none rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500"
                    value={form.contact_name ?? ""}
                    onChange={(e) => handleFormChange("contact_name", e.target.value)}
                  />
                </Field>
                <Field label="Teléfono">
                  <input
                    className="w-full bg-gray-50 border-none rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500"
                    value={form.phone ?? ""}
                    onChange={(e) => handleFormChange("phone", e.target.value)}
                  />
                </Field>
                <Field label="WhatsApp">
                  <input
                    className="w-full bg-gray-50 border-none rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500"
                    value={form.whatsapp ?? ""}
                    onChange={(e) => handleFormChange("whatsapp", e.target.value)}
                  />
                </Field>
                <Field label="Email">
                  <input
                    type="email"
                    className="w-full bg-gray-50 border-none rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500"
                    value={form.email ?? ""}
                    onChange={(e) => handleFormChange("email", e.target.value)}
                  />
                </Field>
                <Field label="Días de despacho">
                  <input
                    className="w-full bg-gray-50 border-none rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500"
                    value={form.dispatch_days ?? ""}
                    onChange={(e) =>
                      handleFormChange("dispatch_days", e.target.value)
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
                      handleFormChange("min_order_amount", e.target.value)
                    }
                  />
                </Field>
                <Field label="Tipo de pago">
                  <input
                    className="w-full bg-gray-50 border-none rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500"
                    value={form.payment_type ?? ""}
                    onChange={(e) =>
                      handleFormChange("payment_type", e.target.value)
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
                      onChange={(e) => handleFormChange("notes", e.target.value)}
                    />
                  </Field>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 flex-wrap pt-2 border-t border-gray-100">
                {form.id ? (
                  <Button
                    type="button"
                    variant="danger"
                    onClick={() => handleDeleteSupplier(form.id!)}
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

          {selectedId ? (
            <div className="bg-white ring-1 ring-gray-200 rounded-2xl shadow-sm p-5 sm:p-6 space-y-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Productos asignados
                </h3>
                <p className="text-sm text-gray-500">
                  Configurá el costo y la cantidad sugerida de compra por
                  producto.
                </p>
              </div>

              <form
                onSubmit={handleSaveAssignment}
                className="grid gap-3 md:grid-cols-6 bg-gray-50 rounded-xl p-4 ring-1 ring-dashed ring-gray-200"
              >
                <div className="md:col-span-2">
                  <Field label="Producto">
                    <select
                      className="w-full bg-white border-none rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500"
                      value={assignmentForm.productId}
                      onChange={(e) => {
                        const id = e.target.value;
                        if (!id) {
                          handleAssignmentChange("productId", "");
                          return;
                        }
                        const selectedProduct = products.find((p) => p.id === id);
                        if (selectedProduct && selectedProduct.purchasePrice) {
                          const withoutVat = selectedProduct.purchasePrice;
                          const withVat = withoutVat * 1.19;
                          setAssignmentForm((prev) => ({
                            ...prev,
                            productId: id,
                            priceWithoutVat: withoutVat.toFixed(2),
                            priceWithVat: withVat.toFixed(2),
                          }));
                        } else {
                          handleAssignmentChange("productId", id);
                        }
                      }}
                      required
                    >
                      <option value="">Selecciona producto</option>
                      {assignmentProducts.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name} (Stock: {product.stock})
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                <Field label="Costo con IVA">
                  <input
                    type="number"
                    step="0.01"
                    className="w-full bg-white border-none rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500"
                    value={assignmentForm.priceWithVat}
                    onChange={(e) => handlePriceCalculation("with", e.target.value)}
                    placeholder="0.00"
                  />
                </Field>

                <Field label="Costo sin IVA">
                  <input
                    type="number"
                    step="0.01"
                    className="w-full bg-white border-none rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500"
                    value={assignmentForm.priceWithoutVat}
                    onChange={(e) =>
                      handlePriceCalculation("without", e.target.value)
                    }
                    placeholder="0.00"
                  />
                </Field>

                <Field label="Cant. sugerida">
                  <input
                    type="number"
                    min={0}
                    className="w-full bg-white border-none rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500"
                    value={assignmentForm.defaultReorderQty}
                    onChange={(e) =>
                      handleAssignmentChange("defaultReorderQty", e.target.value)
                    }
                  />
                </Field>

                <div className="md:col-span-6 flex items-center justify-end">
                  <Button type="submit" disabled={assignmentSaving}>
                    {assignmentSaving ? "Guardando..." : "Asignar producto"}
                  </Button>
                </div>
              </form>

              {/* Mobile cards */}
              <div className="md:hidden space-y-2">
                {assignments.length === 0 ? (
                  <EmptyState
                    icon={<CubeIcon className="h-5 w-5" />}
                    title="Sin productos asignados"
                    description="Asigná productos arriba para automatizar pedidos."
                  />
                ) : (
                  assignments.map((assignment) => {
                    const product = products.find(
                      (p) => p.id === assignment.product_id
                    );
                    const cost = assignment.unit_cost || 0;
                    return (
                      <div
                        key={`${assignment.product_id}-${assignment.supplier_id}`}
                        className="bg-gray-50 ring-1 ring-gray-100 rounded-xl p-4 space-y-2"
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-gray-900 truncate">
                              {product?.name ?? assignment.product_id}
                            </div>
                            {assignment.notes && (
                              <div className="text-xs text-gray-500 italic mt-0.5">
                                {assignment.notes}
                              </div>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-sm font-black text-emerald-700">
                              ${(cost * 1.19).toFixed(2)}
                            </div>
                            <div className="text-[10px] text-gray-400 uppercase font-bold">
                              Con IVA
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-between items-center text-xs border-t border-gray-200 pt-2 gap-2">
                          <div className="flex flex-col min-w-0">
                            <span className="text-gray-400 font-medium">
                              Sin IVA
                            </span>
                            <span className="text-gray-700 font-bold">
                              ${cost.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex flex-col items-center">
                            <span className="text-gray-400 font-medium">
                              Sugerida
                            </span>
                            <span className="text-gray-700 font-bold">
                              {assignment.default_reorder_qty ?? "—"}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteAssignment(assignment.product_id)
                            }
                            disabled={assignmentSaving}
                            className="px-3 py-1.5 bg-rose-50 ring-1 ring-rose-200 text-rose-700 rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-rose-100 transition min-h-[36px]"
                          >
                            Quitar
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block overflow-auto ring-1 ring-gray-200 rounded-xl">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-gray-500">
                        Producto
                      </th>
                      <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-gray-500">
                        Sin IVA
                      </th>
                      <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-gray-500">
                        Con IVA
                      </th>
                      <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-gray-500">
                        Cant. sugerida
                      </th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100 text-sm">
                    {assignments.map((assignment) => {
                      const product = products.find(
                        (p) => p.id === assignment.product_id
                      );
                      const cost = assignment.unit_cost || 0;
                      return (
                        <tr
                          key={`${assignment.product_id}-${assignment.supplier_id}`}
                        >
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">
                              {product?.name ?? assignment.product_id}
                            </div>
                            {assignment.notes ? (
                              <div className="text-xs text-gray-500">
                                {assignment.notes}
                              </div>
                            ) : null}
                          </td>
                          <td className="px-4 py-3 text-right">
                            ${cost.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-emerald-700">
                            ${(cost * 1.19).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {assignment.default_reorder_qty ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() =>
                                handleDeleteAssignment(assignment.product_id)
                              }
                              disabled={assignmentSaving}
                              className="px-3 py-1.5 ring-1 ring-rose-200 text-rose-700 bg-white rounded-lg text-xs font-bold hover:bg-rose-50 transition min-h-[36px]"
                            >
                              Quitar
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {!assignments.length && (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-8 text-center text-sm text-gray-500"
                        >
                          No hay productos asignados a este proveedor.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white ring-1 ring-gray-200 rounded-2xl shadow-sm">
              <EmptyState
                icon={<TruckIcon className="h-7 w-7" />}
                title="Seleccioná un proveedor"
                description="Elegí un proveedor de la lista o creá uno nuevo para empezar."
              />
            </div>
          )}
        </section>
      </div>
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
