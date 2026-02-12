"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useProducts } from "@/contexts/ProductContext";
import Button from "@/components/ui/Button";
import { useToast } from "@/contexts/ToastContext";

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
  // priority: 1, // Removed from UI
  // supplierSku: "", // Removed from UI
  // packSize: "",
  priceWithVat: "",
  priceWithoutVat: "",
  defaultReorderQty: "", // Cantidad sugerida
  // reorderThreshold: "", // Removed from UI
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
  const [assignmentForm, setAssignmentForm] = useState<
    typeof emptyAssignment
  >(emptyAssignment);
  const [assignmentSaving, setAssignmentSaving] = useState(false);

  const filteredSuppliers = useMemo(() => {
    if (!search.trim()) return suppliers;
    const q = search.trim().toLowerCase();
    return suppliers.filter((supplier) =>
      supplier.name?.toLowerCase().includes(q),
    );
  }, [search, suppliers]);

  const loadSuppliers = useCallback(async (currentSearch?: string) => {
    setLoading(true);
    try {
      const qs = currentSearch ? `?search=${encodeURIComponent(currentSearch)}` : "";
      const res = await fetch(`/api/admin/suppliers${qs}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "No se pudieron cargar los proveedores");
      }
      const data = (await res.json()) as Supplier[];
      setSuppliers(data);
      setSelectedId((prev) => {
        if (prev && data.find((s) => s.id === prev)) {
          return prev;
        }
        return data[0]?.id ?? null;
      });
    } catch (error: any) {
      console.error("[Suppliers] load error:", error);
      showToast(error.message || "Error cargando proveedores", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const loadAssignments = useCallback(async (supplierId: string) => {
    try {
      setAssignmentSaving(true);
      const res = await fetch(
        `/api/admin/product-suppliers?supplierId=${encodeURIComponent(
          supplierId,
        )}`,
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
  }, [showToast]);

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
        setAssignmentForm({
          ...emptyAssignment,
          supplierId: supplier.id,
        });
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
          (form.lead_time_days as any) != null && (form.lead_time_days as any) !== ""
            ? Number(form.lead_time_days as any)
            : undefined,
        minOrderAmount:
          (form.min_order_amount as any) != null && (form.min_order_amount as any) !== ""
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
      if (!res.ok) {
        throw new Error(data.error || "No se pudo guardar el proveedor");
      }
      showToast("Proveedor guardado correctamente", "success");
      await loadSuppliers(search);
      if (!form.id && data?.id) {
        setSelectedId(data.id);
      }
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

  const assignmentProducts = useMemo(() => {
    return products
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [products]);

  const handleAssignmentChange = (field: string, value: string) => {
    setAssignmentForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Lógica de cálculo de precios con/sin IVA para asignación
  const handlePriceCalculation = (field: 'with' | 'without', value: string) => {
    const numValue = parseFloat(value);

    if (isNaN(numValue)) {
      setAssignmentForm(prev => ({
        ...prev,
        priceWithVat: field === 'with' ? value : prev.priceWithVat,
        priceWithoutVat: field === 'without' ? value : prev.priceWithoutVat,
      }));
      return;
    }

    if (field === 'with') {
      const withoutVat = numValue / 1.19;
      setAssignmentForm(prev => ({
        ...prev,
        priceWithVat: value,
        priceWithoutVat: withoutVat.toFixed(2),
      }));
    } else {
      const withVat = numValue * 1.19;
      setAssignmentForm(prev => ({
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
        priority: 1, // Default priority
        // supplierSku: undefined, // Removed
        // packSize: undefined,
        unitCost:
          assignmentForm.priceWithoutVat !== ""
            ? Number(assignmentForm.priceWithoutVat)
            : undefined,
        defaultReorderQty:
          assignmentForm.defaultReorderQty !== ""
            ? Number(assignmentForm.defaultReorderQty)
            : undefined,
        // reorderThreshold: undefined, // Removed
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
      setAssignmentForm({
        ...emptyAssignment,
        supplierId: selectedId,
      });
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

  return (
    <div className="space-y-6 py-2">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Proveedores</h1>
          <p className="text-sm text-gray-500">
            Gestiona los proveedores y asigna productos para automatizar
            pedidos.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => loadSuppliers(search)}
          disabled={loading}
        >
          {loading ? "Actualizando..." : "Actualizar lista"}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <aside className="lg:col-span-1 bg-white border rounded-lg shadow-sm p-4 space-y-3">
          <div>
            <input
              type="search"
              placeholder="Buscar proveedor..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
              value={search}
              onChange={(e) => {
                const value = e.target.value;
                setSearch(value);
                loadSuppliers(value);
              }}
            />
          </div>

          <div className="divide-y divide-gray-200 max-h-[70vh] overflow-y-auto pr-1">
            {filteredSuppliers.map((supplier) => (
              <button
                key={supplier.id}
                type="button"
                onClick={() => setSelectedId(supplier.id)}
                className={`w-full text-left px-3 py-3 rounded-md transition ${supplier.id === selectedId
                    ? "bg-blue-50 border border-blue-200"
                    : "hover:bg-gray-50"
                  }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-800">
                    {supplier.name}
                  </span>
                  {supplier.productCount ? (
                    <span className="text-xs font-medium bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                      {supplier.productCount} prod.
                    </span>
                  ) : null}
                </div>
                {supplier.contact_name ? (
                  <p className="text-xs text-gray-500 mt-1">
                    {supplier.contact_name}
                  </p>
                ) : null}
                {(supplier.whatsapp || supplier.phone) && (
                  <p className="text-xs text-gray-400 mt-1">
                    WhatsApp: {supplier.whatsapp || supplier.phone}
                  </p>
                )}
              </button>
            ))}
            {!filteredSuppliers.length && !loading && (
              <p className="text-xs text-gray-500 py-4 text-center">
                No se encontraron proveedores.
              </p>
            )}
          </div>
        </aside>

        <section className="lg:col-span-2 space-y-6">
          <div className="bg-white border rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              {form.id ? "Editar proveedor" : "Crear proveedor"}
            </h2>
            <form onSubmit={handleSaveSupplier} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Nombre
                  </label>
                  <input
                    required
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                    value={form.name ?? ""}
                    onChange={(e) => handleFormChange("name", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Contacto
                  </label>
                  <input
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                    value={form.contact_name ?? ""}
                    onChange={(e) =>
                      handleFormChange("contact_name", e.target.value)
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Teléfono
                  </label>
                  <input
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                    value={form.phone ?? ""}
                    onChange={(e) => handleFormChange("phone", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    WhatsApp
                  </label>
                  <input
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                    value={form.whatsapp ?? ""}
                    onChange={(e) =>
                      handleFormChange("whatsapp", e.target.value)
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    type="email"
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                    value={form.email ?? ""}
                    onChange={(e) => handleFormChange("email", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Días de despacho
                  </label>
                  <input
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                    value={form.dispatch_days ?? ""}
                    onChange={(e) => handleFormChange("dispatch_days", e.target.value)}
                    placeholder="Ej: Lunes, Miércoles"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Pedido mínimo
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                    value={form.min_order_amount ?? ""}
                    onChange={(e) =>
                      handleFormChange("min_order_amount", e.target.value)
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Tipo de pago
                  </label>
                  <input
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                    value={form.payment_type ?? ""}
                    onChange={(e) => handleFormChange("payment_type", e.target.value)}
                    placeholder="Ej: Contado, Crédito 30 días"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Notas
                  </label>
                  <textarea
                    rows={3}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                    value={form.notes ?? ""}
                    onChange={(e) => handleFormChange("notes", e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  {form.id ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setForm(emptyForm);
                        setSelectedId(null);
                      }}
                    >
                      Crear nuevo
                    </Button>
                  ) : null}
                </div>
                <div className="flex gap-2">
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
              </div>
            </form>
          </div>

          {selectedId ? (
            <div className="bg-white border rounded-lg shadow-sm p-6 space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">
                  Productos asignados
                </h3>
                <p className="text-sm text-gray-500">
                  Configura el costo y la cantidad sugerida de compra para cada producto.
                </p>
              </div>

              <form
                onSubmit={handleSaveAssignment}
                className="grid gap-4 md:grid-cols-6 bg-gray-50 border border-dashed border-gray-200 rounded-lg p-4"
              >
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide">
                    Producto
                  </label>
                  <select
                    className="mt-1 w-full rounded-md border border-gray-300 px-2 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                    value={assignmentForm.productId}
                    onChange={(e) =>
                      handleAssignmentChange("productId", e.target.value)
                    }
                    required
                  >
                    <option value="">Selecciona producto</option>
                    {assignmentProducts.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} (Stock: {product.stock})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide">
                    Costo (Con IVA)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="mt-1 w-full rounded-md border border-gray-300 px-2 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                    value={assignmentForm.priceWithVat}
                    onChange={(e) => handlePriceCalculation('with', e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide">
                    Costo (Sin IVA)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="mt-1 w-full rounded-md border border-gray-300 px-2 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                    value={assignmentForm.priceWithoutVat}
                    onChange={(e) => handlePriceCalculation('without', e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide">
                    Cant. sugerida
                  </label>
                  <input
                    type="number"
                    min={0}
                    className="mt-1 w-full rounded-md border border-gray-300 px-2 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                    value={assignmentForm.defaultReorderQty}
                    onChange={(e) =>
                      handleAssignmentChange("defaultReorderQty", e.target.value)
                    }
                  />
                </div>

                <div className="md:col-span-6 flex items-center justify-end">
                  <Button type="submit" disabled={assignmentSaving}>
                    {assignmentSaving ? "Guardando..." : "Asignar producto"}
                  </Button>
                </div>
              </form>

              <div className="overflow-auto border rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Producto
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Costo (Sin IVA)
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Costo (Con IVA)
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Cant. Sugerida
                      </th>
                      <th className="px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200 text-sm">
                    {assignments.map((assignment) => {
                      const product = products.find(
                        (p) => p.id === assignment.product_id,
                      );
                      const cost = assignment.unit_cost || 0;
                      return (
                        <tr key={`${assignment.product_id}-${assignment.supplier_id}`}>
                          <td className="px-4 py-2">
                            <div className="font-medium text-gray-900">
                              {product?.name ?? assignment.product_id}
                            </div>
                            {assignment.notes ? (
                              <div className="text-xs text-gray-500">
                                {assignment.notes}
                              </div>
                            ) : null}
                          </td>
                          <td className="px-4 py-2">${cost.toFixed(2)}</td>
                          <td className="px-4 py-2">${(cost * 1.19).toFixed(2)}</td>
                          <td className="px-4 py-2">
                            {assignment.default_reorder_qty ?? "-"}
                          </td>
                          <td className="px-4 py-2 text-right">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() =>
                                handleDeleteAssignment(assignment.product_id)
                              }
                              disabled={assignmentSaving}
                            >
                              Quitar
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                    {!assignments.length && (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-6 text-center text-sm text-gray-500"
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
            <div className="bg-white border rounded-lg shadow-sm p-8 text-center text-sm text-gray-500">
              Selecciona un proveedor para ver y editar sus detalles.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
