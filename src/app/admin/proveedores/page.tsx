"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useProducts } from "@/contexts/ProductContext";
import { useToast } from "@/contexts/ToastContext";
import {
  TruckIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { PageShell, EmptyState } from "@/components/admin/shell";
import {
  emptyForm,
  emptyAssignment,
  type Supplier,
  type Assignment,
} from "./lib";
import SupplierHero from "./components/SupplierHero";
import SupplierStats from "./components/SupplierStats";
import SupplierList from "./components/SupplierList";
import SupplierForm from "./components/SupplierForm";
import AssignmentsHeader from "./components/AssignmentsHeader";
import AssignmentForm from "./components/AssignmentForm";
import AssignmentsMobileCards from "./components/AssignmentsMobileCards";
import AssignmentsTable from "./components/AssignmentsTable";

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
  const [assignmentSearch, setAssignmentSearch] = useState("");
  const [productPickerSearch, setProductPickerSearch] = useState("");
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const productPickerRef = useRef<HTMLDivElement | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    priceWithVat: "",
    priceWithoutVat: "",
    defaultReorderQty: "",
  });

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

  // Picker: lista filtrada (excluye los ya asignados al proveedor actual)
  const pickerResults = useMemo(() => {
    const assignedSet = new Set(assignments.map((a) => a.product_id));
    const q = productPickerSearch.trim().toLowerCase();
    let arr = assignmentProducts.filter((p) => !assignedSet.has(p.id));
    if (q) {
      arr = arr.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.barcode || "").toLowerCase().includes(q)
      );
    }
    return arr;
  }, [assignmentProducts, assignments, productPickerSearch]);

  const selectedProductObj = useMemo(
    () => products.find((p) => p.id === assignmentForm.productId) || null,
    [products, assignmentForm.productId]
  );

  const selectProduct = (p: (typeof products)[number]) => {
    if (p.purchasePrice) {
      const withoutVat = p.purchasePrice;
      setAssignmentForm((prev) => ({
        ...prev,
        productId: p.id,
        priceWithoutVat: withoutVat.toFixed(2),
        priceWithVat: (withoutVat * 1.19).toFixed(2),
      }));
    } else {
      handleAssignmentChange("productId", p.id);
    }
    setProductPickerOpen(false);
    setProductPickerSearch("");
  };

  const clearSelectedProduct = () => {
    setAssignmentForm((prev) => ({
      ...prev,
      productId: "",
      priceWithVat: "",
      priceWithoutVat: "",
    }));
  };

  // Click outside del picker
  useEffect(() => {
    if (!productPickerOpen) return;
    const onClick = (e: MouseEvent) => {
      if (
        productPickerRef.current &&
        !productPickerRef.current.contains(e.target as Node)
      ) {
        setProductPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [productPickerOpen]);

  // Reset picker al cambiar proveedor
  useEffect(() => {
    setProductPickerSearch("");
    setProductPickerOpen(false);
  }, [selectedId]);

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

  const startEditAssignment = (assignment: Assignment) => {
    const cost = assignment.unit_cost ?? 0;
    setEditingProductId(assignment.product_id);
    setEditForm({
      priceWithoutVat: cost ? Number(cost).toFixed(2) : "",
      priceWithVat: cost ? Number(cost * 1.19).toFixed(2) : "",
      defaultReorderQty:
        assignment.default_reorder_qty != null
          ? String(assignment.default_reorder_qty)
          : "",
    });
  };

  const cancelEditAssignment = () => {
    setEditingProductId(null);
    setEditForm({ priceWithVat: "", priceWithoutVat: "", defaultReorderQty: "" });
  };

  const handleEditPriceChange = (field: "with" | "without", value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      setEditForm((prev) => ({
        ...prev,
        priceWithVat: field === "with" ? value : prev.priceWithVat,
        priceWithoutVat: field === "without" ? value : prev.priceWithoutVat,
      }));
      return;
    }
    if (field === "with") {
      setEditForm((prev) => ({
        ...prev,
        priceWithVat: value,
        priceWithoutVat: (numValue / 1.19).toFixed(2),
      }));
    } else {
      setEditForm((prev) => ({
        ...prev,
        priceWithoutVat: value,
        priceWithVat: (numValue * 1.19).toFixed(2),
      }));
    }
  };

  const saveEditAssignment = async (productId: string) => {
    if (!selectedId) return;
    try {
      setAssignmentSaving(true);
      const payload = {
        productId,
        supplierId: selectedId,
        priority: 1,
        unitCost:
          editForm.priceWithoutVat !== ""
            ? Number(editForm.priceWithoutVat)
            : undefined,
        defaultReorderQty:
          editForm.defaultReorderQty !== ""
            ? Number(editForm.defaultReorderQty)
            : undefined,
      };
      const res = await fetch("/api/admin/product-suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "No se pudo actualizar");
      }
      showToast("Asignación actualizada", "success");
      cancelEditAssignment();
      await loadAssignments(selectedId);
      await loadSuppliers(search);
    } catch (error: any) {
      showToast(error.message || "Error actualizando", "error");
    } finally {
      setAssignmentSaving(false);
    }
  };

  const filteredAssignments = useMemo(() => {
    if (!assignmentSearch.trim()) return assignments;
    const q = assignmentSearch.trim().toLowerCase();
    return assignments.filter((a) => {
      const product = products.find((p) => p.id === a.product_id);
      const name = (product?.name ?? a.product_id).toLowerCase();
      return name.includes(q) || a.product_id.toLowerCase().includes(q);
    });
  }, [assignments, assignmentSearch, products]);

  const assignmentStats = useMemo(() => {
    const total = assignments.length;
    const withCost = assignments.filter((a) => (a.unit_cost ?? 0) > 0).length;
    const withoutCost = total - withCost;
    const withQty = assignments.filter(
      (a) => (a.default_reorder_qty ?? 0) > 0
    ).length;
    return { total, withCost, withoutCost, withQty };
  }, [assignments]);

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
        <SupplierHero
          loading={loading}
          onRefresh={() => loadSuppliers(search)}
        />
      }
    >
      <SupplierStats stats={stats} />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Lista de proveedores */}
        <SupplierList
          search={search}
          onSearchChange={(value) => {
            setSearch(value);
            loadSuppliers(value);
          }}
          onNewSupplier={() => {
            setForm(emptyForm);
            setSelectedId(null);
          }}
          filteredSuppliers={filteredSuppliers}
          selectedId={selectedId}
          onSelect={(id) => setSelectedId(id)}
          loading={loading}
        />

        {/* Form + assignments */}
        <section className="lg:col-span-2 space-y-4">
          <SupplierForm
            form={form}
            saving={saving}
            onFormChange={handleFormChange}
            onSubmit={handleSaveSupplier}
            onDelete={handleDeleteSupplier}
          />

          {selectedId ? (
            <div className="bg-white ring-1 ring-gray-200 rounded-2xl shadow-sm p-5 sm:p-6 space-y-4">
              <AssignmentsHeader
                assignmentsCount={assignments.length}
                assignmentStats={assignmentStats}
              />

              <AssignmentForm
                assignmentForm={assignmentForm}
                assignmentSaving={assignmentSaving}
                productPickerRef={productPickerRef}
                productPickerOpen={productPickerOpen}
                productPickerSearch={productPickerSearch}
                setProductPickerOpen={setProductPickerOpen}
                setProductPickerSearch={setProductPickerSearch}
                pickerResults={pickerResults}
                selectedProductObj={selectedProductObj}
                selectProduct={selectProduct}
                clearSelectedProduct={clearSelectedProduct}
                onSubmit={handleSaveAssignment}
                handlePriceCalculation={handlePriceCalculation}
                handleAssignmentChange={handleAssignmentChange}
              />

              {/* Buscador de asignaciones */}
              {assignments.length > 0 && (
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="search"
                    value={assignmentSearch}
                    onChange={(e) => setAssignmentSearch(e.target.value)}
                    placeholder={`Buscar en ${assignments.length} productos asignados…`}
                    className="w-full bg-gray-50 border-none rounded-xl pl-9 pr-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              )}

              {/* Mobile cards */}
              <AssignmentsMobileCards
                assignments={assignments}
                filteredAssignments={filteredAssignments}
                assignmentSearch={assignmentSearch}
                products={products}
                editingProductId={editingProductId}
                editForm={editForm}
                setEditForm={setEditForm}
                assignmentSaving={assignmentSaving}
                handleEditPriceChange={handleEditPriceChange}
                startEditAssignment={startEditAssignment}
                cancelEditAssignment={cancelEditAssignment}
                saveEditAssignment={saveEditAssignment}
                handleDeleteAssignment={handleDeleteAssignment}
              />

              {/* Desktop table */}
              <AssignmentsTable
                assignments={assignments}
                filteredAssignments={filteredAssignments}
                assignmentSearch={assignmentSearch}
                products={products}
                editingProductId={editingProductId}
                editForm={editForm}
                setEditForm={setEditForm}
                assignmentSaving={assignmentSaving}
                handleEditPriceChange={handleEditPriceChange}
                startEditAssignment={startEditAssignment}
                cancelEditAssignment={cancelEditAssignment}
                saveEditAssignment={saveEditAssignment}
                handleDeleteAssignment={handleDeleteAssignment}
              />
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
