"use client";

import { useState, useMemo, useEffect, useRef, useCallback, useDeferredValue } from "react";
import { useProducts } from "@/contexts/ProductContext";
import { useCategories } from "@/contexts/CategoryContext";
import { hasRealImage } from "@/services/products";
import { useToast } from "@/contexts/ToastContext";
import { read, utils } from "xlsx";
import {
  COLUMN_MAP,
  MAX_BACKUPS,
  PAGE_SIZE,
  VIEW_KEY,
  addBackup,
  createBackup,
  isProductReady,
  loadBackups,
  normalizeHeader,
  saveBackups,
  type Backup,
  type ProductChanges,
} from "./lib";
import PageHeader from "./components/PageHeader";
import HistoryPanel from "./components/HistoryPanel";
import FiltersToolbar from "./components/FiltersToolbar";
import SelectionToolbar from "./components/SelectionToolbar";
import ProductTable from "./components/ProductTable";
import ProductCardsGrid from "./components/ProductCardsGrid";
import MobileSaveBar from "./components/MobileSaveBar";

export default function BulkEditProductsPage() {
  const { products, updateProductsBulk } = useProducts();
  const { categories: allCategories } = useCategories();
  const { showToast } = useToast();

  const [searchTerm, setSearchTerm] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [editedChanges, setEditedChanges] = useState<Record<string, ProductChanges>>({});
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [filterWithImage, setFilterWithImage] = useState(false);
  const [filterReady, setFilterReady] = useState<"all" | "ready" | "pending">("all");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [bulkCategory, setBulkCategory] = useState("");
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [backups, setBackups] = useState<Backup[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [localProducts, setLocalProducts] = useState(products);
  useEffect(() => {
    setLocalProducts(products);
  }, [products]);

  useEffect(() => {
    setBackups(loadBackups());
    const v = localStorage.getItem(VIEW_KEY);
    if (v === "cards" || v === "table") setViewMode(v);
  }, []);

  const changeViewMode = (v: "table" | "cards") => {
    setViewMode(v);
    localStorage.setItem(VIEW_KEY, v);
  };

  const deferredSearch = useDeferredValue(searchTerm);

  const filteredProducts = useMemo(() => {
    const term = deferredSearch.toLowerCase();
    const catFilter = categoryFilter.toLowerCase();
    const result = localProducts.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(term) ||
        p.id?.toLowerCase().includes(term) ||
        p.barcode?.toLowerCase().includes(term);
      const matchesLowStock = filterLowStock ? p.stock <= 5 : true;
      const matchesImage = filterWithImage ? hasRealImage(p) : true;
      const matchesCategory = catFilter
        ? (p.categories || []).some((c: string) => c.toLowerCase() === catFilter)
        : true;
      // Se evalúa sobre los datos guardados (sin cambios pendientes) para que
      // las filas no salten de grupo mientras se escribe; se reagrupa al guardar.
      const ready = isProductReady(p);
      const matchesReady =
        filterReady === "all" ? true : filterReady === "ready" ? ready : !ready;
      return matchesSearch && matchesLowStock && matchesImage && matchesCategory && matchesReady;
    });
    // Agrupa: los productos listos para mostrar van primero
    return result.sort((a, b) => (isProductReady(a) ? 0 : 1) - (isProductReady(b) ? 0 : 1));
  }, [localProducts, deferredSearch, filterLowStock, filterWithImage, filterReady, categoryFilter]);

  const visibleProducts = useMemo(
    () => filteredProducts.slice(0, visibleCount),
    [filteredProducts, visibleCount]
  );

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [deferredSearch, filterLowStock, filterWithImage, filterReady, categoryFilter, viewMode]);

  const readyCount = useMemo(
    () => localProducts.filter((p) => isProductReady(p, editedChanges[p.id])).length,
    [localProducts, editedChanges]
  );

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAllVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      visibleProducts.forEach((p) => next.add(p.id));
      return next;
    });
  };

  const handleInputChange = useCallback((productId: string, field: keyof ProductChanges, value: string | string[]) => {
    const originalProduct = products.find((p) => p.id === productId);
    let newValue: any = value;
    let originalValue: any;

    if (field === "price") {
      newValue = parseFloat(value as string);
      originalValue = originalProduct?.price;
    } else if (field === "offerPrice") {
      newValue = value === "" ? null : parseFloat(value as string);
      originalValue = originalProduct?.offerPrice;
    } else if (field === "stock" || field === "minStock" || field === "optimumStock") {
      newValue = parseInt(value as string, 10);
      originalValue = field === "stock" ? originalProduct?.stock : field === "minStock" ? originalProduct?.minStock : originalProduct?.optimumStock;
    } else if (field === "name") {
      newValue = value;
      originalValue = originalProduct?.name;
    } else if (field === "categories") {
      newValue = typeof value === "string" ? value.split(",").map((s) => s.trim()).filter(Boolean) : value;
      originalValue = originalProduct?.categories;
    }

    const isSame = Array.isArray(newValue)
      ? JSON.stringify(newValue.concat().sort()) === JSON.stringify((originalValue || []).concat().sort())
      : newValue === originalValue;

    if (
      isSame ||
      (field === "price" && isNaN(newValue)) ||
      (field === "offerPrice" && isNaN(newValue) && newValue !== null) ||
      (["stock", "minStock", "optimumStock"].includes(field) && isNaN(newValue))
    ) {
      setEditedChanges((prev) => {
        const next = { ...prev };
        if (next[productId]) {
          delete next[productId][field];
          if (Object.keys(next[productId]).length === 0) delete next[productId];
        }
        return next;
      });
      return;
    }

    setEditedChanges((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [field]: newValue,
      },
    }));
  }, [products]);

  // Las acciones masivas se aplican a la selección si hay productos seleccionados;
  // si no, a todos los filtrados visibles.
  const getBulkTargets = () =>
    selectedIds.size > 0 ? filteredProducts.filter((p) => selectedIds.has(p.id)) : filteredProducts;

  const applyBulkAdjustment = (type: "price_percent" | "price_fixed" | "stock_fixed", value: number) => {
    const newChanges = { ...editedChanges };
    const targets = getBulkTargets();

    targets.forEach((product) => {
      const currentPrice = newChanges[product.id]?.price ?? product.price;
      const currentStock = newChanges[product.id]?.stock ?? product.stock;

      let nextPrice = currentPrice;
      let nextStock = currentStock;

      if (type === "price_percent") {
        nextPrice = Math.round(currentPrice * (1 + value / 100));
      } else if (type === "price_fixed") {
        nextPrice = currentPrice + value;
      } else if (type === "stock_fixed") {
        nextStock = value;
      }

      if (nextPrice !== product.price || nextStock !== product.stock) {
        newChanges[product.id] = {
          ...newChanges[product.id],
          ...(nextPrice !== product.price ? { price: nextPrice } : {}),
          ...(nextStock !== product.stock ? { stock: nextStock } : {}),
        };
      }
    });

    setEditedChanges(newChanges);
    showToast(
      `Ajuste aplicado a ${targets.length} productos${selectedIds.size > 0 ? " seleccionados" : ""}`,
      "info"
    );
    setShowBulkActions(false);
  };

  const assignCategoryToTargets = (cat: string) => {
    if (!cat) {
      showToast("Elige una categoría primero", "info");
      return;
    }
    const targets = getBulkTargets();
    const newChanges = { ...editedChanges };
    let count = 0;
    targets.forEach((p) => {
      const current: string[] = newChanges[p.id]?.categories ?? p.categories ?? [];
      if (current.some((c) => c.toLowerCase() === cat.toLowerCase())) return;
      newChanges[p.id] = { ...newChanges[p.id], categories: [...current, cat] };
      count++;
    });
    setEditedChanges(newChanges);
    showToast(
      count > 0
        ? `Categoría "${cat}" agregada a ${count} productos (pendiente guardar)`
        : "Todos los productos objetivo ya tienen esa categoría",
      count > 0 ? "success" : "info"
    );
  };

  // Completa stock mínimo (5) y óptimo (20) donde falten, para no dejarlos en 0
  const fillMissingStockDefaults = () => {
    const targets = getBulkTargets();
    const newChanges = { ...editedChanges };
    let count = 0;
    targets.forEach((p) => {
      const min = newChanges[p.id]?.minStock ?? p.minStock;
      const opt = newChanges[p.id]?.optimumStock ?? p.optimumStock;
      const patch: ProductChanges = {};
      if (!min || min <= 0) patch.minStock = 5;
      if (!opt || opt <= 0) patch.optimumStock = 20;
      if (Object.keys(patch).length > 0) {
        newChanges[p.id] = { ...newChanges[p.id], ...patch };
        count++;
      }
    });
    setEditedChanges(newChanges);
    showToast(
      count > 0
        ? `Stock mín/ópt completado en ${count} productos (pendiente guardar)`
        : "No hay productos con stock mín/ópt faltante",
      count > 0 ? "success" : "info"
    );
  };

  // Unifica mayúsculas/duplicados de categorías contra la lista oficial
  // (ej. "desayunos" → "Desayunos")
  const normalizeCategoriesBulk = () => {
    const canonical = new Map(allCategories.map((c) => [c.trim().toLowerCase(), c.trim()]));
    const targets = getBulkTargets();
    const newChanges = { ...editedChanges };
    let count = 0;
    targets.forEach((p) => {
      const current: string[] = newChanges[p.id]?.categories ?? p.categories ?? [];
      const seen = new Set<string>();
      const fixed: string[] = [];
      current.forEach((c) => {
        const t = c.trim();
        if (!t) return;
        const norm = canonical.get(t.toLowerCase()) ?? t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
        if (!seen.has(norm.toLowerCase())) {
          seen.add(norm.toLowerCase());
          fixed.push(norm);
        }
      });
      if (JSON.stringify(fixed) !== JSON.stringify(current)) {
        newChanges[p.id] = { ...newChanges[p.id], categories: fixed };
        count++;
      }
    });
    setEditedChanges(newChanges);
    showToast(
      count > 0
        ? `Categorías normalizadas en ${count} productos (pendiente guardar)`
        : "Las categorías ya están normalizadas",
      count > 0 ? "success" : "info"
    );
  };

  const saveAllChanges = async () => {
    const targetIds = Object.keys(editedChanges);
    const updateCount = targetIds.length;

    if (updateCount === 0) {
      showToast("No hay cambios pendientes", "info");
      return;
    }

    const backup = createBackup(localProducts, `Antes de guardar ${updateCount} cambios`);
    const updatedBackups = addBackup(loadBackups(), backup);
    saveBackups(updatedBackups);
    setBackups(updatedBackups);

    setIsSaving(true);

    try {
      await updateProductsBulk(editedChanges as any);
      showToast(`¡${updateCount} productos actualizados con éxito!`, "success");
      setEditedChanges({});
    } catch {
      showToast("Ocurrió un error al guardar los cambios", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleXlsxImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = read(buffer, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: Record<string, any>[] = utils.sheet_to_json(sheet, { defval: "" });

      if (rows.length === 0) {
        showToast("El archivo no contiene datos", "error");
        return;
      }

      const headers = Object.keys(rows[0]);
      const headerFieldMap: Record<string, keyof ProductChanges | "barcode"> = {};
      for (const h of headers) {
        const norm = normalizeHeader(h);
        if (COLUMN_MAP[norm]) headerFieldMap[h] = COLUMN_MAP[norm];
      }

      const byBarcode = new Map<string, any>();
      const byId = new Map<string, any>();
      for (const p of localProducts) {
        if (p.barcode) byBarcode.set(String(p.barcode).trim(), p);
        if (p.id) byId.set(String(p.id).trim(), p);
      }

      const newChanges: Record<string, ProductChanges> = { ...editedChanges };
      let matched = 0;
      let unmatched = 0;

      for (const row of rows) {
        let barcodeVal = "";
        for (const [col, field] of Object.entries(headerFieldMap)) {
          if (field === "barcode" && row[col] !== undefined && row[col] !== "") {
            barcodeVal = String(row[col]).trim();
            break;
          }
        }

        const product = byBarcode.get(barcodeVal) || byId.get(barcodeVal);
        if (!product) {
          unmatched++;
          continue;
        }

        const changes: ProductChanges = {};
        for (const [col, field] of Object.entries(headerFieldMap)) {
          if (field === "barcode") continue;
          const raw = row[col];
          if (raw === "" || raw === undefined || raw === null) continue;

          if (field === "price") {
            const v = parseFloat(String(raw).replace(",", "."));
            if (!isNaN(v) && v !== product.price) changes.price = v;
          } else if (field === "offerPrice") {
            const v = parseFloat(String(raw).replace(",", "."));
            if (!isNaN(v) && v !== product.offerPrice) changes.offerPrice = v;
          } else if (field === "stock") {
            const v = parseInt(String(raw), 10);
            if (!isNaN(v) && v !== product.stock) changes.stock = v;
          } else if (field === "minStock") {
            const v = parseInt(String(raw), 10);
            if (!isNaN(v) && v !== product.minStock) changes.minStock = v;
          } else if (field === "optimumStock") {
            const v = parseInt(String(raw), 10);
            if (!isNaN(v) && v !== product.optimumStock) changes.optimumStock = v;
          } else if (field === "name") {
            const v = String(raw).trim();
            if (v && v !== product.name) changes.name = v;
          } else if (field === "categories") {
            const v = String(raw).split(/[,|;]/).map((s: string) => s.trim()).filter(Boolean);
            if (v.length > 0 && JSON.stringify(v.sort()) !== JSON.stringify([...(product.categories || [])].sort())) {
              changes.categories = v;
            }
          } else if (field === "description") {
            const v = String(raw).trim();
            if (v && v !== (product.description || "")) changes.description = v;
          }
        }

        if (Object.keys(changes).length > 0) {
          newChanges[product.id] = { ...newChanges[product.id], ...changes };
          matched++;
        }
      }

      setEditedChanges(newChanges);
      showToast(
        `XLSX importado: ${matched} productos con cambios${unmatched > 0 ? `, ${unmatched} sin coincidencia` : ""}`,
        matched > 0 ? "success" : "info"
      );
    } catch (err: any) {
      showToast(`Error al leer el archivo: ${err.message}`, "error");
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const restoreBackup = (backup: Backup) => {
    const currentBackup = createBackup(localProducts, `Antes de restaurar "${backup.label}"`);
    const updatedBackups = addBackup(loadBackups(), currentBackup);
    saveBackups(updatedBackups);
    setBackups(updatedBackups);

    const newChanges: Record<string, ProductChanges> = {};
    for (const snap of backup.products) {
      const current = localProducts.find((p) => p.id === snap.id || p.barcode === snap.barcode);
      if (!current) continue;

      const changes: ProductChanges = {};
      if (snap.price !== current.price) changes.price = snap.price;
      if (snap.offerPrice !== (current.offerPrice ?? null)) changes.offerPrice = snap.offerPrice;
      if (snap.stock !== current.stock) changes.stock = snap.stock;
      if (snap.minStock !== (current.minStock ?? 5)) changes.minStock = snap.minStock;
      if (snap.optimumStock !== (current.optimumStock ?? 20)) changes.optimumStock = snap.optimumStock;
      if (snap.name !== current.name) changes.name = snap.name;
      if (snap.description !== (current.description || "")) changes.description = snap.description;
      if (JSON.stringify([...snap.categories].sort()) !== JSON.stringify([...(current.categories || [])].sort())) {
        changes.categories = snap.categories;
      }

      if (Object.keys(changes).length > 0) {
        newChanges[current.id] = changes;
      }
    }

    setEditedChanges(newChanges);
    setShowHistory(false);
    showToast(
      `Restaurado: ${Object.keys(newChanges).length} productos con diferencias (pendiente guardar)`,
      "info"
    );
  };

  const deleteBackup = (backupId: string) => {
    const updated = backups.filter((b) => b.id !== backupId);
    saveBackups(updated);
    setBackups(updated);
  };

  const hasChanges = Object.keys(editedChanges).length > 0;
  const changedCount = Object.keys(editedChanges).length;

  return (
    <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-4 md:py-6 pb-32">
      <PageHeader
        isSaving={isSaving}
        isImporting={isImporting}
        showHistory={showHistory}
        setShowHistory={setShowHistory}
        backupsCount={backups.length}
        fileInputRef={fileInputRef}
        onXlsxImport={handleXlsxImport}
        onSaveAll={saveAllChanges}
        hasChanges={hasChanges}
        changedCount={changedCount}
      />

      {showHistory && (
        <HistoryPanel
          backups={backups}
          onClose={() => setShowHistory(false)}
          onRestore={restoreBackup}
          onDelete={deleteBackup}
        />
      )}

      <FiltersToolbar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        filterLowStock={filterLowStock}
        setFilterLowStock={setFilterLowStock}
        filterWithImage={filterWithImage}
        setFilterWithImage={setFilterWithImage}
        filterReady={filterReady}
        setFilterReady={setFilterReady}
        readyCount={readyCount}
        totalProductsCount={localProducts.length}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        allCategories={allCategories}
        viewMode={viewMode}
        changeViewMode={changeViewMode}
        showBulkActions={showBulkActions}
        setShowBulkActions={setShowBulkActions}
        fileInputRef={fileInputRef}
        isImporting={isImporting}
        showHistory={showHistory}
        setShowHistory={setShowHistory}
        backupsCount={backups.length}
        selectedCount={selectedIds.size}
        filteredCount={filteredProducts.length}
        applyBulkAdjustment={applyBulkAdjustment}
        bulkCategory={bulkCategory}
        setBulkCategory={setBulkCategory}
        assignCategoryToTargets={assignCategoryToTargets}
        fillMissingStockDefaults={fillMissingStockDefaults}
        normalizeCategoriesBulk={normalizeCategoriesBulk}
      />

      <div className="relative">
        {(viewMode === "cards" || selectedIds.size > 0) && (
          <SelectionToolbar
            visibleProductsCount={visibleProducts.length}
            selectedCount={selectedIds.size}
            onSelectAllVisible={selectAllVisible}
            onClearSelection={() => setSelectedIds(new Set())}
          />
        )}

        {viewMode === "table" && (
          <ProductTable
            visibleProducts={visibleProducts}
            editedChanges={editedChanges}
            onChange={handleInputChange}
          />
        )}

        <ProductCardsGrid
          viewMode={viewMode}
          visibleProducts={visibleProducts}
          editedChanges={editedChanges}
          onChange={handleInputChange}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
        />

        {filteredProducts.length > visibleCount && (
          <div className="mt-6 text-center">
            <button
              onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
              className="px-8 h-12 rounded-2xl bg-white border-2 border-gray-200 hover:border-emerald-400 font-black text-xs uppercase tracking-widest text-gray-500 hover:text-emerald-600 transition-colors shadow-sm"
            >
              Mostrar más ({filteredProducts.length - visibleCount} restantes)
            </button>
          </div>
        )}

        {filteredProducts.length === 0 && (
          <div className="py-24 md:py-32 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-gray-100">
            <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl">🔍</div>
            <p className="text-xl font-black text-gray-300 mb-1 tracking-widest uppercase">Sin productos</p>
            <p className="text-sm text-gray-400 font-medium italic">Prueba con términos más generales.</p>
          </div>
        )}
      </div>

      <MobileSaveBar
        hasChanges={hasChanges}
        changedCount={changedCount}
        isSaving={isSaving}
        onSaveAll={saveAllChanges}
      />

      <div className="hidden md:flex mt-8 justify-center gap-6 text-[10px] font-black uppercase tracking-widest text-gray-400 opacity-60">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500" /> Cambios detectados
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-500" /> Alerta Stock Bajo
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-violet-500" /> Backups disponibles: {backups.length}/{MAX_BACKUPS}
        </div>
        <div className="flex items-center gap-2 italic">Desarrollado para Android & Chrome</div>
      </div>
    </div>
  );
}
