"use client";

import { useState, useMemo, useEffect, useRef, useCallback, useDeferredValue, memo } from "react";
import { useProducts } from "@/contexts/ProductContext";
import { useCategories } from "@/contexts/CategoryContext";
import { hasRealImage } from "@/services/products";
import { useToast } from "@/contexts/ToastContext";
import Button from "@/components/ui/Button";
import { read, utils } from "xlsx";
import {
  MagnifyingGlassIcon,
  ArrowPathIcon,
  CloudArrowUpIcon,
  ExclamationCircleIcon,
  PlusIcon,
  MinusIcon,
  PercentBadgeIcon,
  CheckCircleIcon,
  ArrowUpTrayIcon,
  ClockIcon,
  ArrowUturnLeftIcon,
  XMarkIcon,
  PhotoIcon,
  CheckBadgeIcon,
  ChevronDownIcon,
  CheckIcon,
  Squares2X2Icon,
  TableCellsIcon,
  TagIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";

type ProductChanges = { price?: number; offerPrice?: number | null; stock?: number; minStock?: number; optimumStock?: number; name?: string; categories?: string[]; description?: string };

interface ProductSnapshot {
  id: string;
  barcode: string;
  name: string;
  price: number;
  offerPrice: number | null;
  stock: number;
  minStock: number;
  optimumStock: number;
  categories: string[];
  description: string;
}

interface Backup {
  id: string;
  timestamp: string;
  label: string;
  products: ProductSnapshot[];
}

const BACKUP_KEY = "olivo-bulk-editor-backups";
const VIEW_KEY = "olivo-bulk-editor-view";
const MAX_BACKUPS = 10;
// Renderizar cientos de filas con inputs congela la página; se pagina de a 60.
const PAGE_SIZE = 60;

function loadBackups(): Backup[] {
  try {
    const raw = localStorage.getItem(BACKUP_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveBackups(backups: Backup[]) {
  localStorage.setItem(BACKUP_KEY, JSON.stringify(backups));
}

function createBackup(products: any[], label: string): Backup {
  return {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    label,
    products: products.map((p) => ({
      id: p.id,
      barcode: p.barcode || "",
      name: p.name,
      price: p.price,
      offerPrice: p.offerPrice ?? null,
      stock: p.stock,
      minStock: p.minStock ?? 5,
      optimumStock: p.optimumStock ?? 20,
      categories: p.categories || [],
      description: p.description || "",
    })),
  };
}

function addBackup(existing: Backup[], newBackup: Backup): Backup[] {
  const updated = [newBackup, ...existing];
  return updated.slice(0, MAX_BACKUPS);
}

// Un producto está "listo para mostrar" si tiene imagen, precio, stock, SKU y categoría
function isProductReady(p: any, changes?: ProductChanges): boolean {
  const price = changes?.price ?? p.price;
  const stock = changes?.stock ?? p.stock;
  const categories = changes?.categories ?? p.categories ?? [];
  return (
    hasRealImage(p) &&
    Number(price) > 0 &&
    Number(stock) > 0 &&
    Boolean(p.barcode) &&
    categories.length > 0
  );
}

function normalizeHeader(h: string): string {
  return String(h)
    .toLowerCase()
    .trim()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

const COLUMN_MAP: Record<string, keyof ProductChanges | "barcode"> = {
  barcode: "barcode",
  codigobarras: "barcode",
  codigo: "barcode",
  sku: "barcode",
  idsku: "barcode",
  nombre: "name",
  name: "name",
  producto: "name",
  precio: "price",
  price: "price",
  saleprice: "price",
  precioven: "price",
  oferta: "offerPrice",
  offerprice: "offerPrice",
  preciooferta: "offerPrice",
  ofertaprecio: "offerPrice",
  stock: "stock",
  existencia: "stock",
  cantidad: "stock",
  stockminimo: "minStock",
  minstock: "minStock",
  minimo: "minStock",
  stockoptimo: "optimumStock",
  optimumstock: "optimumStock",
  optimo: "optimumStock",
  categorias: "categories",
  categories: "categories",
  categoria: "categories",
  descripcion: "description",
  description: "description",
  desc: "description",
};

export default function BulkEditProductsPage() {
  const { products, updateProduct, updateProductsBulk } = useProducts();
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
    } catch (error) {
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight mb-1 uppercase">
            Inventario <span className="text-emerald-600 italic">Smart</span>
          </h1>
          <p className="text-sm text-gray-500 font-medium">Gestión rápida de precios y existencias.</p>
        </div>

        <div className="hidden md:flex gap-3">
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
            className="rounded-2xl border-2 font-bold px-5 h-12"
            disabled={isSaving}
          >
            <ArrowPathIcon className="w-5 h-5 mr-2" /> Refrescar
          </Button>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`relative flex items-center gap-2 px-5 h-12 rounded-2xl font-bold border-2 transition-all ${
              showHistory
                ? "bg-violet-100 text-violet-700 border-violet-200"
                : "bg-white text-gray-500 border-gray-200 hover:border-violet-200 hover:text-violet-600"
            }`}
          >
            <ClockIcon className="w-5 h-5" />
            Historial
            {backups.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-violet-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center">
                {backups.length}
              </span>
            )}
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="flex items-center gap-2 px-5 h-12 rounded-2xl font-bold border-2 bg-white text-gray-500 border-gray-200 hover:border-emerald-300 hover:text-emerald-600 transition-all disabled:opacity-50"
          >
            {isImporting ? (
              <ArrowPathIcon className="w-5 h-5 animate-spin" />
            ) : (
              <ArrowUpTrayIcon className="w-5 h-5" />
            )}
            Importar XLSX
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleXlsxImport}
          />
          <Button
            onClick={saveAllChanges}
            disabled={!hasChanges || isSaving}
            className={`rounded-2xl px-8 h-12 font-black shadow-xl transition-all ${
              hasChanges ? "bg-emerald-600 shadow-emerald-500/20 scale-105" : "bg-gray-400 opacity-50"
            }`}
          >
            {isSaving ? (
              <ArrowPathIcon className="w-5 h-5 animate-spin mr-2" />
            ) : (
              <CloudArrowUpIcon className="w-5 h-5 mr-2" />
            )}
            Guardar {changedCount} cambios
          </Button>
        </div>
      </div>

      {showHistory && (
        <div className="mb-6 bg-white rounded-[2rem] border border-violet-100 shadow-xl shadow-violet-100/30 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-violet-50 bg-violet-50/50">
            <div className="flex items-center gap-3">
              <ClockIcon className="w-5 h-5 text-violet-500" />
              <span className="font-black text-violet-900 uppercase tracking-widest text-sm">Historial de Backups</span>
              <span className="text-xs text-violet-500 font-medium">({backups.length}/{MAX_BACKUPS} guardados)</span>
            </div>
            <button onClick={() => setShowHistory(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {backups.length === 0 ? (
            <div className="py-10 text-center text-gray-400 text-sm font-medium">
              No hay backups guardados aún. Se crean automáticamente al guardar cambios.
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {backups.map((backup, i) => (
                <div key={backup.id} className="flex items-center justify-between px-6 py-4 hover:bg-violet-50/30 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-xl bg-violet-100 flex items-center justify-center text-violet-600 font-black text-xs">
                      {i + 1}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-800">{backup.label}</p>
                      <p className="text-xs text-gray-400 font-medium">
                        {new Date(backup.timestamp).toLocaleString("es-CL")} · {backup.products.length} productos
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => restoreBackup(backup)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 text-white text-xs font-black hover:bg-violet-700 transition-colors"
                    >
                      <ArrowUturnLeftIcon className="w-3.5 h-3.5" />
                      Restaurar
                    </button>
                    <button
                      onClick={() => deleteBackup(backup.id)}
                      className="p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-[2rem] p-3 md:p-4 shadow-xl shadow-gray-200/50 border border-gray-100 mb-5 sticky top-4 z-30">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Nombre, SKU o Barcode..."
              className="w-full pl-12 pr-6 h-12 bg-gray-50 border-0 rounded-2xl focus:ring-2 focus:ring-emerald-500 font-medium text-gray-900 shadow-inner"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterLowStock(!filterLowStock)}
              title="Solo productos con stock bajo"
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 h-12 rounded-2xl font-bold transition-all border-2 ${
                filterLowStock
                  ? "bg-amber-100 text-amber-700 border-amber-200 shadow-lg shadow-amber-200/20"
                  : "bg-gray-50 text-gray-400 border-transparent hover:bg-gray-100"
              }`}
            >
              <ExclamationCircleIcon className="w-5 h-5 shrink-0" />
              <span className="md:hidden">Stock Bajo</span>
            </button>
            <button
              onClick={() => setFilterWithImage(!filterWithImage)}
              title="Solo productos con imagen"
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 h-12 rounded-2xl font-bold transition-all border-2 ${
                filterWithImage
                  ? "bg-sky-100 text-sky-700 border-sky-200 shadow-lg shadow-sky-200/20"
                  : "bg-gray-50 text-gray-400 border-transparent hover:bg-gray-100"
              }`}
            >
              <PhotoIcon className="w-5 h-5 shrink-0" />
              <span className="md:hidden">Con Imagen</span>
            </button>
            <button
              onClick={() => setFilterReady(filterReady === "ready" ? "all" : "ready")}
              title="Productos listos para mostrar: imagen, precio, stock, SKU y categoría"
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 h-12 rounded-2xl font-bold transition-all border-2 ${
                filterReady === "ready"
                  ? "bg-emerald-100 text-emerald-700 border-emerald-200 shadow-lg shadow-emerald-200/20"
                  : "bg-gray-50 text-gray-400 border-transparent hover:bg-gray-100"
              }`}
            >
              <CheckBadgeIcon className="w-5 h-5 shrink-0" />
              <span>Listos ({readyCount})</span>
            </button>
            <button
              onClick={() => setFilterReady(filterReady === "pending" ? "all" : "pending")}
              title="Productos a los que falta imagen, precio, stock, SKU o categoría"
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 h-12 rounded-2xl font-bold transition-all border-2 ${
                filterReady === "pending"
                  ? "bg-rose-100 text-rose-700 border-rose-200 shadow-lg shadow-rose-200/20"
                  : "bg-gray-50 text-gray-400 border-transparent hover:bg-gray-100"
              }`}
            >
              <ExclamationCircleIcon className="w-5 h-5 shrink-0" />
              <span>Incompletos ({localProducts.length - readyCount})</span>
            </button>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              title="Filtrar por categoría"
              className={`flex-1 md:flex-none h-12 px-3 rounded-2xl font-bold text-sm border-2 transition-all focus:outline-none cursor-pointer ${
                categoryFilter
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-gray-50 text-gray-400 border-transparent hover:bg-gray-100"
              }`}
            >
              <option value="">Todas las categorías</option>
              {allCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <div className="flex rounded-2xl border-2 border-gray-100 overflow-hidden shrink-0">
              <button
                onClick={() => changeViewMode("table")}
                title="Vista tabla"
                className={`px-4 h-12 transition-colors flex items-center justify-center ${
                  viewMode === "table" ? "bg-emerald-100 text-emerald-700" : "bg-gray-50 text-gray-400 hover:bg-gray-100"
                }`}
              >
                <TableCellsIcon className="w-5 h-5" />
              </button>
              <button
                onClick={() => changeViewMode("cards")}
                title="Vista barajitas (selección múltiple)"
                className={`px-4 h-12 transition-colors flex items-center justify-center ${
                  viewMode === "cards" ? "bg-emerald-100 text-emerald-700" : "bg-gray-50 text-gray-400 hover:bg-gray-100"
                }`}
              >
                <Squares2X2Icon className="w-5 h-5" />
              </button>
            </div>
            <button
              onClick={() => setShowBulkActions(!showBulkActions)}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 h-12 rounded-2xl font-bold transition-all border-2 ${
                showBulkActions
                  ? "bg-indigo-100 text-indigo-700 border-indigo-200"
                  : "bg-gray-50 text-gray-400 border-transparent"
              }`}
            >
              <PercentBadgeIcon className="w-5 h-5 shrink-0" />
              <span className="hidden md:inline">Acciones Masivas</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className="md:hidden flex-1 flex items-center justify-center gap-2 px-4 h-12 rounded-2xl font-bold border-2 bg-gray-50 text-gray-400 border-transparent hover:bg-gray-100 disabled:opacity-50"
            >
              {isImporting ? (
                <ArrowPathIcon className="w-5 h-5 animate-spin" />
              ) : (
                <ArrowUpTrayIcon className="w-5 h-5 shrink-0" />
              )}
            </button>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`md:hidden relative flex-1 flex items-center justify-center gap-2 px-4 h-12 rounded-2xl font-bold border-2 transition-all ${
                showHistory
                  ? "bg-violet-100 text-violet-700 border-violet-200"
                  : "bg-gray-50 text-gray-400 border-transparent"
              }`}
            >
              <ClockIcon className="w-5 h-5 shrink-0" />
              {backups.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-violet-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center">
                  {backups.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {showBulkActions && (
          <div className="mt-4 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 animate-in slide-in-from-top-2 duration-300 space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
              {selectedIds.size > 0
                ? `Se aplicarán a los ${selectedIds.size} productos seleccionados`
                : `Se aplicarán a los ${filteredProducts.length} productos filtrados`}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <button
                onClick={() => applyBulkAdjustment("price_percent", 10)}
                className="flex flex-col items-center justify-center p-3 bg-white rounded-xl border border-indigo-100 hover:border-indigo-400 transition-colors shadow-sm"
              >
                <PlusIcon className="w-4 h-4 text-indigo-600 mb-1" />
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-900">+10% Precio</span>
              </button>
              <button
                onClick={() => applyBulkAdjustment("price_percent", -10)}
                className="flex flex-col items-center justify-center p-3 bg-white rounded-xl border border-indigo-100 hover:border-indigo-400 transition-colors shadow-sm"
              >
                <MinusIcon className="w-4 h-4 text-indigo-600 mb-1" />
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-900">-10% Precio</span>
              </button>
              <button
                onClick={() => applyBulkAdjustment("price_fixed", 100)}
                className="flex flex-col items-center justify-center p-3 bg-white rounded-xl border border-indigo-100 hover:border-indigo-400 transition-colors shadow-sm"
              >
                <div className="text-xs font-black text-indigo-600 mb-1">+$100</div>
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-900">Aumentar Fijo</span>
              </button>
              <button
                onClick={() => {
                  const stockStr = prompt("¿Qué stock quieres fijar para los productos objetivo?", "10");
                  if (stockStr) applyBulkAdjustment("stock_fixed", parseInt(stockStr));
                }}
                className="flex flex-col items-center justify-center p-3 bg-white rounded-xl border border-indigo-100 hover:border-indigo-400 transition-colors shadow-sm"
              >
                <CheckCircleIcon className="w-4 h-4 text-indigo-600 mb-1" />
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-900">Fijar Stock</span>
              </button>
            </div>
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex flex-1 gap-2">
                <select
                  value={bulkCategory}
                  onChange={(e) => setBulkCategory(e.target.value)}
                  className="flex-1 h-11 px-3 rounded-xl border border-indigo-100 bg-white text-xs font-bold text-indigo-900 focus:outline-none focus:border-indigo-400"
                >
                  <option value="">Elegir categoría...</option>
                  {allCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => assignCategoryToTargets(bulkCategory)}
                  className="flex items-center gap-1.5 px-4 h-11 rounded-xl bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-colors"
                >
                  <TagIcon className="w-4 h-4" />
                  Asignar
                </button>
              </div>
              <button
                onClick={fillMissingStockDefaults}
                title="Pone stock mínimo 5 y óptimo 20 donde estén vacíos o en cero"
                className="flex items-center justify-center gap-1.5 px-4 h-11 rounded-xl bg-white border border-indigo-100 hover:border-indigo-400 text-[10px] font-black uppercase tracking-widest text-indigo-900 transition-colors shadow-sm"
              >
                <SparklesIcon className="w-4 h-4 text-indigo-600" />
                Completar Mín/Ópt
              </button>
              <button
                onClick={normalizeCategoriesBulk}
                title='Unifica mayúsculas y duplicados de categorías (ej. "desayunos" → "Desayunos")'
                className="flex items-center justify-center gap-1.5 px-4 h-11 rounded-xl bg-white border border-indigo-100 hover:border-indigo-400 text-[10px] font-black uppercase tracking-widest text-indigo-900 transition-colors shadow-sm"
              >
                <SparklesIcon className="w-4 h-4 text-indigo-600" />
                Normalizar Categorías
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="relative">
        {(viewMode === "cards" || selectedIds.size > 0) && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <button
              onClick={selectAllVisible}
              className="px-4 h-9 rounded-xl bg-white border-2 border-gray-100 hover:border-emerald-300 text-[10px] font-black uppercase tracking-widest text-gray-500 transition-colors"
            >
              Seleccionar visibles ({visibleProducts.length})
            </button>
            {selectedIds.size > 0 && (
              <>
                <span className="px-3 h-9 inline-flex items-center rounded-xl bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-widest">
                  {selectedIds.size} seleccionados
                </span>
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="px-3 h-9 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                >
                  Limpiar
                </button>
                <span className="text-[10px] font-bold text-gray-400 italic">
                  Las acciones masivas se aplicarán solo a la selección
                </span>
              </>
            )}
          </div>
        )}

        {viewMode === "table" && (
          <div className="hidden lg:block bg-white rounded-[2.5rem] shadow-2xl shadow-gray-200/40 border border-gray-50 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Producto / SKU</th>
                  <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 w-48">Categorías</th>
                  <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 w-28 text-right">Precio ($)</th>
                  <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 w-28 text-right">Oferta ($)</th>
                  <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 w-24 text-right">Stock</th>
                  <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 w-20 text-right">Mín.</th>
                  <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 w-20 text-right">Ópt.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {visibleProducts.map((product) => (
                  <EditableRow key={product.id} product={product} changes={editedChanges[product.id]} onChange={handleInputChange} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div
          className={
            viewMode === "table"
              ? "lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-4"
              : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4"
          }
        >
          {visibleProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              changes={editedChanges[product.id]}
              onChange={handleInputChange}
              selected={selectedIds.has(product.id)}
              onToggleSelect={toggleSelect}
            />
          ))}
        </div>

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

      <div className="md:hidden fixed bottom-6 left-4 right-4 z-50 animate-in slide-in-from-bottom-5 duration-500">
        <div className="bg-gray-950/90 backdrop-blur-md rounded-3xl p-4 shadow-2xl border border-white/10 flex items-center justify-between gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest italic">Inventory Manager</span>
            <span className="text-white text-sm font-bold">
              {hasChanges ? `${changedCount} cambios pendientes` : "Sin cambios listos"}
            </span>
          </div>
          <button
            onClick={saveAllChanges}
            disabled={!hasChanges || isSaving}
            className={`h-12 px-6 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
              hasChanges ? "bg-emerald-500 text-white shadow-lg active:scale-95" : "bg-white/10 text-white/30"
            }`}
          >
            {isSaving ? "Guardando..." : "Aplicar Todo"}
          </button>
        </div>
      </div>

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

function CategorySelector({ value, isDirty, onChange }: { value: string[]; isDirty: boolean; onChange: (next: string[]) => void }) {
  const { categories: allCategories } = useCategories();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const options = useMemo(() => {
    const set = new Set<string>(allCategories);
    value.forEach((c) => set.add(c));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "es"));
  }, [allCategories, value]);

  const toggleOpen = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      const width = Math.max(r.width, 240);
      const left = Math.min(r.left, window.innerWidth - width - 8);
      const top = Math.min(r.bottom + 4, window.innerHeight - 280);
      setPos({ top, left, width });
    }
    setOpen(!open);
  };

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (panelRef.current?.contains(e.target as Node) || btnRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const close = () => setOpen(false);
    document.addEventListener("mousedown", onClickOutside);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  const toggleCategory = (cat: string) => {
    const next = value.includes(cat) ? value.filter((c) => c !== cat) : [...value, cat];
    onChange(next);
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggleOpen}
        className={`w-full flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-[0.05em] transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${
          isDirty
            ? "bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-inner"
            : value.length > 0
            ? "bg-gray-100 text-gray-600 border border-transparent hover:bg-gray-200"
            : "bg-rose-50 text-rose-400 border border-rose-100 hover:bg-rose-100"
        }`}
      >
        <span className="flex-1 truncate text-left">{value.length > 0 ? value.join(", ") : "Sin categoría"}</span>
        <ChevronDownIcon className={`w-3 h-3 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && pos && (
        <div
          ref={panelRef}
          style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width }}
          className="z-[60] max-h-64 overflow-y-auto bg-white rounded-xl border border-gray-200 shadow-2xl p-1.5"
        >
          {options.length === 0 && (
            <p className="px-2 py-2 text-[10px] text-gray-400 font-bold">No hay categorías creadas</p>
          )}
          {options.map((cat) => {
            const checked = value.includes(cat);
            return (
              <button
                key={cat}
                type="button"
                onClick={() => toggleCategory(cat)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-[10px] font-black uppercase tracking-wide transition-colors ${
                  checked ? "bg-emerald-50 text-emerald-700" : "text-gray-500 hover:bg-gray-50"
                }`}
              >
                <span
                  className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                    checked ? "bg-emerald-500 border-emerald-500 text-white" : "border-gray-300"
                  }`}
                >
                  {checked && <CheckIcon className="w-2.5 h-2.5" strokeWidth={3} />}
                </span>
                <span className="truncate">{cat}</span>
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}

const EditableRow = memo(function EditableRow({ product, changes, onChange }: { product: any; changes?: ProductChanges; onChange: any }) {
  const isDirty = Object.keys(changes || {}).length > 0;
  const ready = isProductReady(product, changes);

  return (
    <tr className={`hover:bg-emerald-50/10 transition-colors group ${isDirty ? "bg-emerald-50/5" : ""}`}>
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0 hidden sm:block">
            {hasRealImage(product) ? (
              <img src={product.image} alt={product.name} className="w-9 h-9 rounded-lg object-cover shadow-sm bg-white border border-gray-100" />
            ) : (
              <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 text-xs">📦</div>
            )}
            {isDirty && <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full animate-pulse" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              {ready && <CheckBadgeIcon className="w-4 h-4 text-emerald-500 shrink-0" title="Listo para mostrar" />}
              <input
                type="text"
                value={changes?.name ?? product.name}
                onChange={(e) => onChange(product.id, "name", e.target.value)}
                className={`w-full text-sm font-bold leading-tight px-1 py-0.5 bg-transparent border-b-2 transition-all focus:outline-none focus:border-emerald-500 ${
                  changes?.name !== undefined ? "border-emerald-500 text-emerald-700" : "border-transparent text-gray-800 hover:border-gray-300"
                }`}
              />
            </div>
            <div className="flex items-center gap-2 px-1 mt-0.5">
              {product.barcode ? (
                <span className="text-[9px] font-black text-emerald-400 uppercase tracking-tighter">{product.barcode}</span>
              ) : (
                <span className="text-[9px] font-black text-rose-300 uppercase tracking-tighter">Sin SKU</span>
              )}
            </div>
          </div>
        </div>
      </td>
      <td className="px-3 py-2.5">
        <CategorySelector
          value={changes?.categories ?? product.categories ?? []}
          isDirty={changes?.categories !== undefined}
          onChange={(next) => onChange(product.id, "categories", next)}
        />
      </td>
      <td className="px-3 py-2.5 text-right w-28">
        <div className="inline-flex items-center relative w-full justify-end">
          <span className="absolute left-2 text-xs font-bold text-gray-400 pointer-events-none">$</span>
          <input
            type="number"
            inputMode="decimal"
            value={changes?.price ?? product.price}
            onChange={(e) => onChange(product.id, "price", e.target.value)}
            className={`w-full h-9 bg-white text-right font-black text-sm rounded-lg border-2 px-2 pl-5 focus:ring-4 focus:ring-emerald-500/10 transition-all ${
              changes?.price !== undefined ? "border-emerald-500 text-emerald-700" : "border-transparent text-gray-900 hover:border-gray-200 shadow-sm"
            }`}
          />
        </div>
      </td>
      <td className="px-3 py-2.5 text-right w-28">
        <div className="inline-flex items-center relative w-full justify-end">
          <span className="absolute left-2 text-xs font-bold text-gray-400 pointer-events-none">$</span>
          <input
            type="number"
            inputMode="decimal"
            placeholder="-"
            value={changes?.offerPrice !== undefined ? changes.offerPrice ?? "" : product.offerPrice || ""}
            onChange={(e) => onChange(product.id, "offerPrice", e.target.value)}
            className={`w-full h-9 bg-white text-right font-black text-sm rounded-lg border-2 px-2 pl-5 focus:ring-4 focus:ring-amber-500/10 transition-all ${
              changes?.offerPrice !== undefined && changes?.offerPrice !== null
                ? "border-amber-400 text-amber-700"
                : "border-transparent text-gray-900 hover:border-gray-200 shadow-sm bg-gray-50/50"
            }`}
          />
        </div>
      </td>
      <td className="px-3 py-2.5 text-right w-24">
        <div className="inline-flex items-center relative w-full justify-end">
          <input
            type="number"
            inputMode="numeric"
            value={changes?.stock ?? product.stock}
            onChange={(e) => onChange(product.id, "stock", e.target.value)}
            className={`w-full h-9 bg-white text-right font-black text-sm rounded-lg border-2 px-2 focus:ring-4 focus:ring-emerald-500/10 transition-all ${
              changes?.stock !== undefined
                ? "border-emerald-500 text-emerald-700"
                : product.stock <= 5
                ? "border-amber-100 text-amber-600 bg-amber-50"
                : "border-transparent text-gray-600 hover:border-gray-200 shadow-sm"
            }`}
          />
          {product.stock <= 5 && changes?.stock === undefined && (
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-amber-500 rounded-full" />
          )}
        </div>
      </td>
      <td className="px-3 py-2.5 text-right w-20">
        <div className="inline-flex items-center relative w-full justify-end">
          <input
            type="number"
            inputMode="numeric"
            value={changes?.minStock ?? product.minStock}
            onChange={(e) => onChange(product.id, "minStock", e.target.value)}
            className={`w-full h-9 bg-white text-right font-black text-sm rounded-lg border-2 px-2 focus:ring-4 focus:ring-emerald-500/10 transition-all ${
              changes?.minStock !== undefined ? "border-emerald-500 text-emerald-700" : "border-transparent text-gray-600 hover:border-gray-200 shadow-sm"
            }`}
          />
        </div>
      </td>
      <td className="px-3 py-2.5 text-right w-20">
        <div className="inline-flex items-center relative w-full justify-end">
          <input
            type="number"
            inputMode="numeric"
            value={changes?.optimumStock ?? product.optimumStock}
            onChange={(e) => onChange(product.id, "optimumStock", e.target.value)}
            className={`w-full h-9 bg-white text-right font-black text-sm rounded-lg border-2 px-2 focus:ring-4 focus:ring-emerald-500/10 transition-all ${
              changes?.optimumStock !== undefined
                ? "border-emerald-500 text-emerald-700"
                : "border-transparent text-gray-600 hover:border-gray-200 shadow-sm"
            }`}
          />
        </div>
      </td>
    </tr>
  );
});

const ProductCard = memo(function ProductCard({
  product,
  changes,
  onChange,
  selected,
  onToggleSelect,
}: {
  product: any;
  changes?: ProductChanges;
  onChange: any;
  selected: boolean;
  onToggleSelect: (id: string) => void;
}) {
  const isDirty = Object.keys(changes || {}).length > 0;
  const ready = isProductReady(product, changes);
  const price = changes?.price ?? product.price;
  const stock = changes?.stock ?? product.stock;
  const cats = changes?.categories ?? product.categories ?? [];

  const missing: string[] = [];
  if (!hasRealImage(product)) missing.push("Sin foto");
  if (!(Number(price) > 0)) missing.push("Sin precio");
  if (!(Number(stock) > 0)) missing.push("Sin stock");
  if (!product.barcode) missing.push("Sin SKU");
  if (cats.length === 0) missing.push("Sin categoría");

  return (
    <div
      className={`relative rounded-3xl border-2 overflow-hidden bg-white transition-all ${
        selected
          ? "border-emerald-500 ring-4 ring-emerald-500/15 shadow-xl shadow-emerald-500/10"
          : isDirty
          ? "border-emerald-300 shadow-lg shadow-emerald-500/5"
          : "border-gray-100 shadow-sm hover:border-gray-200 hover:shadow-md"
      }`}
    >
      <button
        type="button"
        onClick={() => onToggleSelect(product.id)}
        title={selected ? "Quitar de la selección" : "Seleccionar"}
        className={`absolute top-2 left-2 z-10 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all shadow ${
          selected
            ? "bg-emerald-500 border-emerald-500 text-white"
            : "bg-white/90 border-gray-300 text-transparent hover:border-emerald-400"
        }`}
      >
        <CheckIcon className="w-4 h-4" strokeWidth={3} />
      </button>

      {ready ? (
        <span className="absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest shadow">
          <CheckBadgeIcon className="w-3.5 h-3.5" /> Listo
        </span>
      ) : (
        <span
          className="absolute top-2 right-2 z-10 px-2 py-0.5 rounded-full bg-rose-500/90 text-white text-[9px] font-black uppercase tracking-widest shadow"
          title={missing.join(", ")}
        >
          Faltan {missing.length}
        </span>
      )}

      <div
        className="h-28 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center cursor-pointer"
        onClick={() => onToggleSelect(product.id)}
      >
        {hasRealImage(product) ? (
          <img src={product.image} alt={product.name} loading="lazy" className="h-full w-full object-contain p-2" />
        ) : (
          <span className="text-4xl opacity-40">📦</span>
        )}
      </div>

      <div className="p-3 space-y-2">
        <input
          type="text"
          value={changes?.name ?? product.name}
          onChange={(e) => onChange(product.id, "name", e.target.value)}
          className={`w-full text-sm font-black leading-tight bg-transparent border-b-2 pb-1 transition-all focus:outline-none focus:border-emerald-500 truncate ${
            changes?.name !== undefined ? "border-emerald-500 text-emerald-700" : "border-transparent text-gray-900 hover:border-gray-200"
          }`}
        />
        <p className="text-[9px] font-black text-gray-400 tracking-tighter uppercase truncate opacity-60">
          SKU: {product.barcode || String(product.id).slice(0, 15)}
        </p>

        {missing.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {missing.map((m) => (
              <span key={m} className="px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-500 text-[8px] font-black uppercase tracking-widest">
                {m}
              </span>
            ))}
          </div>
        )}

        <CategorySelector
          value={cats}
          isDirty={changes?.categories !== undefined}
          onChange={(next) => onChange(product.id, "categories", next)}
        />

        <div className="grid grid-cols-3 gap-1.5">
          <div className="space-y-1">
            <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest px-1">Precio</label>
            <div className="relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400">$</span>
              <input
                type="number"
                inputMode="decimal"
                value={changes?.price ?? product.price}
                onChange={(e) => onChange(product.id, "price", e.target.value)}
                className={`w-full h-9 rounded-lg border border-gray-200 font-black text-xs pl-5 pr-1 shadow-inner ${
                  changes?.price !== undefined
                    ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                    : "bg-gray-50 text-gray-900 focus:bg-white focus:border-emerald-500"
                }`}
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[8px] font-black text-amber-500/80 uppercase tracking-widest px-1">Oferta</label>
            <div className="relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400">$</span>
              <input
                type="number"
                inputMode="decimal"
                placeholder="-"
                value={changes?.offerPrice !== undefined ? changes.offerPrice ?? "" : product.offerPrice || ""}
                onChange={(e) => onChange(product.id, "offerPrice", e.target.value)}
                className={`w-full h-9 rounded-lg border border-gray-200 font-black text-xs pl-5 pr-1 shadow-inner ${
                  changes?.offerPrice !== undefined && changes?.offerPrice !== null
                    ? "bg-amber-50 border-amber-300 text-amber-800"
                    : "bg-gray-50 text-gray-900 focus:bg-white focus:border-amber-500"
                }`}
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest px-1">Stock</label>
            <input
              type="number"
              inputMode="numeric"
              value={changes?.stock ?? product.stock}
              onChange={(e) => onChange(product.id, "stock", e.target.value)}
              className={`w-full h-9 rounded-lg border border-gray-200 font-black text-xs px-2 text-center shadow-inner ${
                changes?.stock !== undefined
                  ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                  : product.stock <= 5
                  ? "bg-red-50 border-red-300 text-red-700"
                  : "bg-gray-50 text-gray-900 focus:bg-white focus:border-emerald-500"
              }`}
            />
          </div>
        </div>
      </div>
    </div>
  );
});
