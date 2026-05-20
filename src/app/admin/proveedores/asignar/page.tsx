"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeftIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowsRightLeftIcon,
} from "@heroicons/react/24/outline";
import Button from "@/components/ui/Button";
import { useToast } from "@/contexts/ToastContext";
import {
  PageShell,
  HeroHeader,
  EmptyState,
} from "@/components/admin/shell";

type Supplier = { id: string; name: string };

type AssignedSupplier = { id: string; name: string | null };

type ProductRow = {
  barcode: string;
  name: string | null;
  category: string | null;
  stock: number | null;
  sale_price: number | null;
  purchase_price: number | null;
  image_url: string | null;
  is_active?: boolean;
  hasSupplier?: boolean;
  assignedSuppliers?: AssignedSupplier[];
};

export default function BulkAssignSuppliersPage() {
  const { showToast } = useToast();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierId, setSupplierId] = useState<string>("");
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);

  const [products, setProducts] = useState<ProductRow[]>([]);
  const [assignedCount, setAssignedCount] = useState(0);
  const [unassignedCount, setUnassignedCount] = useState(0);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [includeAssigned, setIncludeAssigned] = useState(true);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showToast]);

  const loadProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (category.trim()) params.set("category", category.trim());
      if (includeAssigned) params.set("includeAssigned", "1");
      params.set("limit", "500");
      const res = await fetch(
        `/api/admin/products/without-supplier?${params}`
      );
      if (!res.ok) throw new Error("No se pudieron cargar productos");
      const data = await res.json();
      setProducts(data.items ?? []);
      setAssignedCount(Number(data.assignedCount ?? 0));
      setUnassignedCount(Number(data.unassignedCount ?? 0));
    } catch (e: any) {
      showToast(e.message || "Error cargando productos", "error");
    } finally {
      setLoadingProducts(false);
    }
  }, [search, category, includeAssigned, showToast]);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);
  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Auto-select overwrite cuando includeAssigned se activa
  useEffect(() => {
    if (includeAssigned && !overwrite) {
      // hint: overwrite suele querer ir junto, pero lo dejo en manos del user
    }
  }, [includeAssigned, overwrite]);

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
    if (selected.size === 0)
      return showToast("Selecciona al menos un producto", "error");

    setSaving(true);
    setLastResult(null);
    try {
      const body = {
        supplier_id: supplierId,
        barcodes: Array.from(selected),
        unit_cost: unitCost ? Number(unitCost) : null,
        pack_size: packSize ? Number(packSize) : null,
        default_reorder_qty: defaultReorderQty
          ? Number(defaultReorderQty)
          : null,
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
        `Listo: ${data.inserted} nuevos${
          data.updated ? `, ${data.updated} actualizados` : ""
        }`,
        "success"
      );
      setSelected(new Set());
      await loadProducts();
    } catch (e: any) {
      showToast(e.message || "Error guardando asignaciones", "error");
    } finally {
      setSaving(false);
    }
  };

  const selectedCount = selected.size;
  const selectedSupplierName =
    suppliers.find((s) => s.id === supplierId)?.name || "—";

  // ¿Cuántos de los seleccionados ya tienen otro proveedor?
  const selectedAlreadyAssigned = useMemo(() => {
    let count = 0;
    visibleProducts.forEach((p) => {
      if (selected.has(p.barcode) && p.hasSupplier) count++;
    });
    return count;
  }, [selected, visibleProducts]);

  return (
    <PageShell
      breadcrumbs={[
        { label: "Proveedores", href: "/admin/proveedores" },
        { label: "Asignación masiva" },
      ]}
      hero={
        <HeroHeader
          kicker="Compras"
          title="Asignación masiva de proveedores"
          subtitle="Vinculá o reasigná productos a un proveedor con sus defaults de costo, pack y umbrales. Esto alimenta el motor de reposición."
          icon={
            <ArrowsRightLeftIcon className="w-6 h-6 text-emerald-300" />
          }
          right={
            <Link
              href="/admin/proveedores"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white/10 ring-1 ring-white/15 rounded-xl text-white text-xs font-bold uppercase tracking-widest hover:bg-white/15 transition-colors min-h-[36px]"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              Volver
            </Link>
          }
        />
      }
    >
      {/* Configuración de la asignación */}
      <div className="bg-white ring-1 ring-gray-200 rounded-2xl p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="md:col-span-2 lg:col-span-3">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-600 mb-1">
            Proveedor destino
          </label>
          <select
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            className="w-full bg-gray-50 border-none rounded-xl px-3 py-2.5 text-sm font-bold focus:ring-2 focus:ring-emerald-500"
            disabled={loadingSuppliers}
          >
            <option value="">Selecciona…</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <Field
          label="Costo unitario (CLP)"
          value={unitCost}
          setValue={setUnitCost}
          placeholder="ej: 850"
        />
        <Field
          label="Pack size (unidades por bulto)"
          value={packSize}
          setValue={setPackSize}
          placeholder="ej: 12"
        />
        <Field
          label="Cant. sugerida por defecto"
          value={defaultReorderQty}
          setValue={setDefaultReorderQty}
          placeholder="ej: 24"
        />
        <Field
          label="Umbral de reposición"
          value={reorderThreshold}
          setValue={setReorderThreshold}
          placeholder="ej: 5"
        />
        <Field
          label="Prioridad (1 = primario)"
          value={priority}
          setValue={setPriority}
          placeholder="1"
        />

        <label className="flex items-center gap-2 text-sm text-gray-700 bg-emerald-50 rounded-xl px-3 py-2.5 ring-1 ring-emerald-100 cursor-pointer self-end min-h-[44px]">
          <input
            type="checkbox"
            checked={overwrite}
            onChange={(e) => setOverwrite(e.target.checked)}
            className="rounded text-emerald-600 focus:ring-emerald-500"
          />
          <span className="font-semibold">
            Sobrescribir si ya existe la asignación
          </span>
        </label>
      </div>

      {/* Filtros + búsqueda */}
      <div className="bg-white ring-1 ring-gray-200 rounded-2xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o código de barras…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") loadProducts();
              }}
              className="w-full bg-gray-50 border-none rounded-xl pl-9 pr-3 py-2.5 text-sm font-bold focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <input
            type="text"
            placeholder="Categoría (opcional)"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") loadProducts();
            }}
            className="bg-gray-50 border-none rounded-xl px-3 py-2.5 text-sm font-bold focus:ring-2 focus:ring-emerald-500 sm:w-48"
          />
          <Button onClick={loadProducts}>Buscar</Button>
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700 bg-amber-50 rounded-xl px-3 py-2.5 ring-1 ring-amber-100 cursor-pointer min-h-[44px]">
          <input
            type="checkbox"
            checked={includeAssigned}
            onChange={(e) => setIncludeAssigned(e.target.checked)}
            className="rounded text-amber-600 focus:ring-amber-500"
          />
          <span className="font-semibold">
            Incluir productos que ya tienen proveedor
          </span>
          {includeAssigned && (
            <span className="ml-auto text-[10px] font-black uppercase tracking-widest text-amber-700">
              Marcá &quot;sobrescribir&quot; para reasignar
            </span>
          )}
        </label>
      </div>

      {/* Tabla de productos */}
      <div className="bg-white ring-1 ring-gray-200 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100 bg-gray-50 flex-wrap gap-2">
          <div className="text-xs font-bold uppercase tracking-wider text-gray-600">
            {loadingProducts
              ? "Cargando…"
              : includeAssigned
              ? `${visibleProducts.length} productos · ${assignedCount} ya asignados`
              : `${visibleProducts.length} productos sin proveedor`}
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={toggleAllVisible}
              className="text-xs font-bold uppercase tracking-wider text-emerald-700 hover:text-emerald-900 min-h-[36px]"
              disabled={visibleProducts.length === 0}
            >
              {allVisibleSelected
                ? "Deseleccionar visibles"
                : "Seleccionar visibles"}
            </button>
            <span className="text-xs text-gray-500">
              {selectedCount} seleccionados
            </span>
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto divide-y divide-gray-100">
          {visibleProducts.length === 0 && !loadingProducts && (
            <EmptyState
              icon={<CheckCircleIcon className="h-7 w-7" />}
              title={
                includeAssigned
                  ? "No se encontraron productos con esos filtros"
                  : "No hay productos sin proveedor con esos filtros"
              }
              description={
                !includeAssigned && (search || category) ? (
                  <>
                    Si el producto que buscás ya tiene proveedor, activá{" "}
                    <b>&quot;Incluir productos que ya tienen proveedor&quot;</b> arriba
                    para reasignarlo.
                  </>
                ) : undefined
              }
            />
          )}
          {visibleProducts.map((p) => {
            const checked = selected.has(p.barcode);
            const sameSupplierAssigned =
              !!supplierId &&
              (p.assignedSuppliers ?? []).some((s) => s.id === supplierId);
            const otherSuppliersAssigned =
              (p.assignedSuppliers ?? []).filter((s) => s.id !== supplierId);
            return (
              <label
                key={p.barcode}
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-emerald-50/40 transition-colors min-h-[64px] ${
                  checked ? "bg-emerald-50" : ""
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(p.barcode)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-sm font-semibold truncate ${
                        p.is_active === false
                          ? "text-gray-500"
                          : "text-gray-900"
                      }`}
                    >
                      {p.name || "(sin nombre)"}
                    </span>
                    {p.is_active === false && (
                      <span className="text-[9px] font-black uppercase tracking-widest bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-md ring-1 ring-gray-200 whitespace-nowrap">
                        Inactivo
                      </span>
                    )}
                    {sameSupplierAssigned && (
                      <span className="text-[9px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-md ring-1 ring-emerald-200 whitespace-nowrap">
                        Ya asignado
                      </span>
                    )}
                    {!sameSupplierAssigned &&
                      otherSuppliersAssigned.length > 0 && (
                        <span
                          className="text-[9px] font-black uppercase tracking-widest bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-md ring-1 ring-amber-200 whitespace-nowrap"
                          title={otherSuppliersAssigned
                            .map((s) => s.name)
                            .filter(Boolean)
                            .join(", ")}
                        >
                          Tiene otro proveedor
                        </span>
                      )}
                  </div>
                  <div className="text-[11px] text-gray-500 font-mono truncate">
                    {p.barcode}
                    {p.category ? ` · ${p.category}` : ""}
                    {otherSuppliersAssigned.length > 0 &&
                      !sameSupplierAssigned && (
                        <>
                          {" · "}
                          <span className="not-italic text-amber-700">
                            {otherSuppliersAssigned
                              .map((s) => s.name)
                              .filter(Boolean)
                              .join(", ")}
                          </span>
                        </>
                      )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[10px] text-gray-400 uppercase tracking-wider">
                    stock
                  </div>
                  <div
                    className={`text-sm font-bold ${
                      Number(p.stock ?? 0) <= 0
                        ? "text-rose-600"
                        : "text-gray-800"
                    }`}
                  >
                    {p.stock ?? 0}
                  </div>
                </div>
                <div className="text-right shrink-0 w-20 hidden sm:block">
                  <div className="text-[10px] text-gray-400 uppercase tracking-wider">
                    venta
                  </div>
                  <div className="text-sm font-bold text-gray-800">
                    {p.sale_price
                      ? `$${Number(p.sale_price).toLocaleString("es-CL")}`
                      : "—"}
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Aviso si overwrite=false pero hay productos ya asignados seleccionados */}
      {selectedAlreadyAssigned > 0 && !overwrite && (
        <div className="bg-amber-50 ring-1 ring-amber-200 rounded-xl p-3 flex items-start gap-3 text-sm">
          <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          <div className="flex-1">
            <div className="font-bold text-amber-900">
              {selectedAlreadyAssigned} de los seleccionados ya tienen otro
              proveedor
            </div>
            <div className="text-amber-800/80">
              Si querés reasignarlos a <b>{selectedSupplierName}</b>, activá{" "}
              <b>&quot;Sobrescribir si ya existe la asignación&quot;</b> arriba. Si
              no, se crearán como segundo proveedor (prioridad {priority}).
            </div>
          </div>
        </div>
      )}

      {/* Botón de acción sticky */}
      <div
        className="sticky bottom-0 bg-white/95 backdrop-blur ring-1 ring-gray-200 rounded-2xl px-4 py-3 flex items-center justify-between gap-3 flex-wrap shadow-lg"
        style={{
          marginBottom: "calc(env(safe-area-inset-bottom) + 8px)",
        }}
      >
        <div className="text-sm text-gray-600">
          {supplierId ? (
            <>
              Asignar <b>{selectedCount}</b> productos a{" "}
              <b>{selectedSupplierName}</b>
            </>
          ) : (
            "Seleccioná un proveedor"
          )}
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
        <div className="bg-emerald-50 ring-1 ring-emerald-200 rounded-xl p-4 text-sm text-emerald-900">
          <div className="font-bold mb-1">Asignación completada</div>
          <div>· Nuevos vínculos: {lastResult.inserted}</div>
          {lastResult.updated > 0 && (
            <div>· Actualizados: {lastResult.updated}</div>
          )}
          {lastResult.skipped_existing > 0 && (
            <div>
              · Omitidos (ya asignados): {lastResult.skipped_existing}
            </div>
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

      {/* Footer info */}
      <p className="text-[11px] text-gray-400 text-center">
        Total catálogo: {unassignedCount + assignedCount} ·{" "}
        {unassignedCount} sin proveedor · {assignedCount} con proveedor
      </p>
    </PageShell>
  );
}

function Field({
  label,
  value,
  setValue,
  placeholder,
}: {
  label: string;
  value: string;
  setValue: (v: string) => void;
  placeholder?: string;
}) {
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
        className="w-full bg-gray-50 border-none rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500"
      />
    </div>
  );
}
