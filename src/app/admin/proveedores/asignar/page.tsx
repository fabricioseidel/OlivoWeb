"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeftIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import Button from "@/components/ui/Button";
import { useToast } from "@/contexts/ToastContext";

type Supplier = { id: string; name: string };

type ProductRow = {
  barcode: string;
  name: string | null;
  category: string | null;
  stock: number | null;
  sale_price: number | null;
  purchase_price: number | null;
  image_url: string | null;
};

export default function BulkAssignSuppliersPage() {
  const { showToast } = useToast();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierId, setSupplierId] = useState<string>("");
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);

  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [unitCost, setUnitCost] = useState<string>("");
  const [packSize, setPackSize] = useState<string>("");
  const [defaultReorderQty, setDefaultReorderQty] = useState<string>("");
  const [reorderThreshold, setReorderThreshold] = useState<string>("");
  const [priority, setPriority] = useState<string>("1");
  const [overwrite, setOverwrite] = useState<boolean>(false);
  const [saving, setSaving] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);

  const loadSuppliers = useCallback(async () => {
    setLoadingSuppliers(true);
    try {
      const res = await fetch("/api/admin/suppliers");
      if (!res.ok) throw new Error("No se pudieron cargar proveedores");
      const data = (await res.json()) as Supplier[];
      setSuppliers(data);
      if (data.length > 0 && !supplierId) setSupplierId(data[0].id);
    } catch (e: any) {
      showToast(e.message || "Error cargando proveedores", "error");
    } finally {
      setLoadingSuppliers(false);
    }
  }, [showToast, supplierId]);

  const loadUnassigned = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (category.trim()) params.set("category", category.trim());
      params.set("limit", "500");
      const res = await fetch(`/api/admin/products/without-supplier?${params}`);
      if (!res.ok) throw new Error("No se pudieron cargar productos");
      const data = await res.json();
      setProducts(data.items ?? []);
    } catch (e: any) {
      showToast(e.message || "Error cargando productos", "error");
    } finally {
      setLoadingProducts(false);
    }
  }, [search, category, showToast]);

  useEffect(() => { loadSuppliers(); }, [loadSuppliers]);
  useEffect(() => { loadUnassigned(); }, [loadUnassigned]);

  const visibleProducts = products;

  const toggle = (barcode: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(barcode)) next.delete(barcode);
      else next.add(barcode);
      return next;
    });
  };

  const allVisibleSelected =
    visibleProducts.length > 0 &&
    visibleProducts.every((p) => selected.has(p.barcode));

  const toggleAllVisible = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        visibleProducts.forEach((p) => next.delete(p.barcode));
      } else {
        visibleProducts.forEach((p) => next.add(p.barcode));
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!supplierId) return showToast("Selecciona un proveedor", "error");
    if (selected.size === 0) return showToast("Selecciona al menos un producto", "error");

    setSaving(true);
    setLastResult(null);
    try {
      const body = {
        supplier_id: supplierId,
        barcodes: Array.from(selected),
        unit_cost: unitCost ? Number(unitCost) : null,
        pack_size: packSize ? Number(packSize) : null,
        default_reorder_qty: defaultReorderQty ? Number(defaultReorderQty) : null,
        reorder_threshold: reorderThreshold ? Number(reorderThreshold) : null,
        priority: priority ? Number(priority) : 1,
        overwrite,
      };

      const res = await fetch("/api/admin/product-suppliers/bulk-assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error en asignación");
      setLastResult(data);
      showToast(
        `Listo: ${data.inserted} nuevos${data.updated ? `, ${data.updated} actualizados` : ""}`,
        "success"
      );
      setSelected(new Set());
      await loadUnassigned();
    } catch (e: any) {
      showToast(e.message || "Error guardando asignaciones", "error");
    } finally {
      setSaving(false);
    }
  };

  const selectedCount = selected.size;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/proveedores"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Proveedores
        </Link>
      </div>

      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black tracking-tight text-gray-900">
          Asignación masiva de proveedores
        </h1>
        <p className="text-sm text-gray-500">
          Vincula productos sin proveedor (o reasigna) a un proveedor con sus
          defaults de pack, costo y umbrales. Esto alimenta el motor de
          reposición.
        </p>
      </div>

      {/* Configuración de la asignación */}
      <div className="bg-white border rounded-2xl p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="md:col-span-2 lg:col-span-3">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-600 mb-1">
            Proveedor
          </label>
          <select
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
            disabled={loadingSuppliers}
          >
            <option value="">Selecciona…</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <Field label="Costo unitario (CLP)" value={unitCost} setValue={setUnitCost} placeholder="ej: 850" />
        <Field label="Pack size (unidades por bulto)" value={packSize} setValue={setPackSize} placeholder="ej: 12" />
        <Field label="Cantidad sugerida por defecto" value={defaultReorderQty} setValue={setDefaultReorderQty} placeholder="ej: 24" />
        <Field label="Umbral de reposición" value={reorderThreshold} setValue={setReorderThreshold} placeholder="ej: 5" />
        <Field label="Prioridad (1 = primario)" value={priority} setValue={setPriority} placeholder="1" />

        <label className="flex items-center gap-2 text-sm text-gray-700 self-end">
          <input
            type="checkbox"
            checked={overwrite}
            onChange={(e) => setOverwrite(e.target.checked)}
            className="rounded text-emerald-600 focus:ring-emerald-500"
          />
          Sobrescribir asignaciones existentes a este proveedor
        </label>
      </div>

      {/* Filtros + búsqueda */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o barcode…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <input
          type="text"
          placeholder="Categoría (opcional)"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 sm:w-48"
        />
        <Button onClick={loadUnassigned} className="sm:w-auto">
          Buscar
        </Button>
      </div>

      {/* Tabla de productos */}
      <div className="bg-white border rounded-2xl overflow-hidden">
        <div className="px-4 py-3 flex items-center justify-between border-b bg-gray-50">
          <div className="text-xs font-bold uppercase tracking-wider text-gray-600">
            {loadingProducts
              ? "Cargando…"
              : `${visibleProducts.length} productos sin proveedor`}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleAllVisible}
              className="text-xs font-bold uppercase tracking-wider text-emerald-700 hover:text-emerald-900"
              disabled={visibleProducts.length === 0}
            >
              {allVisibleSelected ? "Deseleccionar visibles" : "Seleccionar visibles"}
            </button>
            <span className="text-xs text-gray-500">{selectedCount} seleccionados</span>
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto divide-y">
          {visibleProducts.length === 0 && !loadingProducts && (
            <div className="px-6 py-10 text-center text-sm text-gray-500">
              <CheckCircleIcon className="h-8 w-8 mx-auto text-emerald-400 mb-2" />
              No hay productos sin proveedor con esos filtros.
            </div>
          )}
          {visibleProducts.map((p) => {
            const checked = selected.has(p.barcode);
            return (
              <label
                key={p.barcode}
                className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-emerald-50/40 ${checked ? "bg-emerald-50" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(p.barcode)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-900 truncate">
                    {p.name || "(sin nombre)"}
                  </div>
                  <div className="text-[11px] text-gray-500 font-mono truncate">
                    {p.barcode} {p.category ? `· ${p.category}` : ""}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs text-gray-500">stock</div>
                  <div className={`text-sm font-bold ${Number(p.stock ?? 0) <= 0 ? "text-rose-600" : "text-gray-800"}`}>
                    {p.stock ?? 0}
                  </div>
                </div>
                <div className="text-right shrink-0 w-20">
                  <div className="text-xs text-gray-500">venta</div>
                  <div className="text-sm font-bold text-gray-800">
                    {p.sale_price ? `$${Number(p.sale_price).toLocaleString()}` : "—"}
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Botón de acción */}
      <div className="sticky bottom-0 bg-white border-t -mx-4 sm:-mx-8 px-4 sm:px-8 py-4 flex items-center justify-between gap-4 shadow-[0_-4px_8px_rgba(0,0,0,0.03)]">
        <div className="text-sm text-gray-600">
          {supplierId
            ? <>Asignar <b>{selectedCount}</b> productos a{" "}
                <b>{suppliers.find((s) => s.id === supplierId)?.name || "—"}</b></>
            : "Selecciona un proveedor"}
        </div>
        <Button
          onClick={handleSubmit}
          disabled={saving || selectedCount === 0 || !supplierId}
          className="min-w-[160px]"
        >
          {saving ? "Guardando…" : "Asignar a proveedor"}
        </Button>
      </div>

      {/* Resultado última operación */}
      {lastResult && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-900">
          <div className="font-bold mb-1">Asignación completada</div>
          <div>· Nuevos vínculos: {lastResult.inserted}</div>
          {lastResult.updated > 0 && <div>· Actualizados: {lastResult.updated}</div>}
          {lastResult.skipped_existing > 0 && (
            <div>· Omitidos (ya asignados): {lastResult.skipped_existing}</div>
          )}
          {lastResult.skipped_unknown_barcodes?.length > 0 && (
            <div className="mt-2 flex items-start gap-2 text-amber-700">
              <ExclamationTriangleIcon className="h-4 w-4 mt-0.5" />
              <span>
                {lastResult.skipped_unknown_barcodes.length} códigos no
                coincidieron con productos existentes.
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Field({
  label, value, setValue, placeholder,
}: { label: string; value: string; setValue: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-600 mb-1">
        {label}
      </label>
      <input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
      />
    </div>
  );
}
