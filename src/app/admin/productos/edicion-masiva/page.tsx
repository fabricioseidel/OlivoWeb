"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useProducts } from "@/contexts/ProductContext";
import { useToast } from "@/contexts/ToastContext";
import Button from "@/components/ui/Button";
import { read, utils } from "xlsx";
import {
  MagnifyingGlassIcon,
  ArrowPathIcon,
  CloudArrowUpIcon,
  FunnelIcon,
  ExclamationCircleIcon,
  PlusIcon,
  MinusIcon,
  PercentBadgeIcon,
  CheckCircleIcon,
  ArrowUpTrayIcon,
  ClockIcon,
  ArrowUturnLeftIcon,
  XMarkIcon,
  DocumentArrowDownIcon,
} from "@heroicons/react/24/outline";

type ProductChanges = { price?: number; offerPrice?: number | null; stock?: number; minStock?: number; optimumStock?: number; name?: string; categories?: string[] };

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
}

interface Backup {
  id: string;
  timestamp: string;
  label: string;
  products: ProductSnapshot[];
}

const BACKUP_KEY = "olivo-bulk-editor-backups";
const MAX_BACKUPS = 10;

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
    })),
  };
}

function addBackup(existing: Backup[], newBackup: Backup): Backup[] {
  const updated = [newBackup, ...existing];
  return updated.slice(0, MAX_BACKUPS);
}

// Normaliza encabezados de xlsx para mapeo flexible
function normalizeHeader(h: string): string {
  return String(h).toLowerCase().trim().replace(/[\s_\-]/g, "");
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
};

export default function BulkEditProductsPage() {
  const { products, updateProduct } = useProducts();
  const { showToast } = useToast();

  const [searchTerm, setSearchTerm] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [editedChanges, setEditedChanges] = useState<Record<string, ProductChanges>>({});
  const [filterLowStock, setFilterLowStock] = useState(false);
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
  }, []);

  const filteredProducts = useMemo(() => {
    return localProducts.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.barcode?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesLowStock = filterLowStock ? p.stock <= 5 : true;
      return matchesSearch && matchesLowStock;
    });
  }, [localProducts, searchTerm, filterLowStock]);

  const handleInputChange = (productId: string, field: keyof ProductChanges, value: string | string[]) => {
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
  };

  const applyBulkAdjustment = (type: "price_percent" | "price_fixed" | "stock_fixed", value: number) => {
    const newChanges = { ...editedChanges };

    filteredProducts.forEach((product) => {
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
    showToast(`Ajuste aplicado a ${filteredProducts.length} productos`, "info");
    setShowBulkActions(false);
  };

  const saveAllChanges = async () => {
    const targetIds = Object.keys(editedChanges);
    const updateCount = targetIds.length;

    if (updateCount === 0) {
      showToast("No hay cambios pendientes", "info");
      return;
    }

    // Crear backup antes de guardar
    const backup = createBackup(localProducts, `Antes de guardar ${updateCount} cambios`);
    const updatedBackups = addBackup(loadBackups(), backup);
    saveBackups(updatedBackups);
    setBackups(updatedBackups);

    setIsSaving(true);
    let success = 0;

    try {
      for (const id of targetIds) {
        const changes = editedChanges[id];
        await updateProduct(id, changes as any);
        success++;
      }

      showToast(`¡${success} productos actualizados con éxito!`, "success");
      setEditedChanges({});
    } catch {
      showToast("Ocurrió un error al guardar algunos cambios", "error");
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

      // Construir mapa de encabezados normalizados → campo
      const headers = Object.keys(rows[0]);
      const headerFieldMap: Record<string, keyof ProductChanges | "barcode"> = {};
      for (const h of headers) {
        const norm = normalizeHeader(h);
        if (COLUMN_MAP[norm]) headerFieldMap[h] = COLUMN_MAP[norm];
      }

      // Construir índice de productos por barcode y por id
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
        // Obtener barcode/id del row
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
      // Reset input para permitir reimportar el mismo archivo
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const restoreBackup = (backup: Backup) => {
    // Crear backup del estado actual antes de restaurar
    const currentBackup = createBackup(localProducts, `Antes de restaurar "${backup.label}"`);
    const updatedBackups = addBackup(loadBackups(), currentBackup);
    saveBackups(updatedBackups);
    setBackups(updatedBackups);

    // Calcular diffs entre el backup y el estado actual
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 pb-32">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight mb-2 uppercase">
            Inventario <span className="text-emerald-600 italic">Smart</span>
          </h1>
          <p className="text-sm text-gray-500 font-medium">Gestión rápida de precios y existencias.</p>
        </div>

        <div className="hidden md:flex gap-3">
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
            className="rounded-2xl border-2 font-bold px-6 h-14"
            disabled={isSaving}
          >
            <ArrowPathIcon className="w-5 h-5 mr-2" /> Refrescar
          </Button>
          {/* Historial */}
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`relative flex items-center gap-2 px-6 h-14 rounded-2xl font-bold border-2 transition-all ${
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
          {/* Importar XLSX */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="flex items-center gap-2 px-6 h-14 rounded-2xl font-bold border-2 bg-white text-gray-500 border-gray-200 hover:border-emerald-300 hover:text-emerald-600 transition-all disabled:opacity-50"
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
            className={`rounded-2xl px-10 h-14 font-black shadow-xl transition-all ${
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

      {/* Panel de Historial */}
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

      {/* Toolbar & Filters */}
      <div className="bg-white rounded-[2rem] p-4 md:p-6 shadow-xl shadow-gray-200/50 border border-gray-100 mb-6 sticky top-4 z-30">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Nombre, SKU o Barcode..."
              className="w-full pl-12 pr-6 h-14 bg-gray-50 border-0 rounded-2xl focus:ring-2 focus:ring-emerald-500 font-medium text-gray-900 shadow-inner"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setFilterLowStock(!filterLowStock)}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 h-14 rounded-2xl font-bold transition-all border-2 ${
                filterLowStock
                  ? "bg-amber-100 text-amber-700 border-amber-200 shadow-lg shadow-amber-200/20"
                  : "bg-gray-50 text-gray-400 border-transparent hover:bg-gray-100"
              }`}
            >
              <ExclamationCircleIcon className="w-5 h-5 shrink-0" />
              <span className="md:hidden">Stock Bajo</span>
            </button>
            <button
              onClick={() => setShowBulkActions(!showBulkActions)}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 h-14 rounded-2xl font-bold transition-all border-2 ${
                showBulkActions
                  ? "bg-indigo-100 text-indigo-700 border-indigo-200"
                  : "bg-gray-50 text-gray-400 border-transparent"
              }`}
            >
              <PercentBadgeIcon className="w-5 h-5 shrink-0" />
              <span className="hidden md:inline">Acciones Masivas</span>
            </button>
            {/* Botones mobile */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className="md:hidden flex-1 flex items-center justify-center gap-2 px-4 h-14 rounded-2xl font-bold border-2 bg-gray-50 text-gray-400 border-transparent hover:bg-gray-100 disabled:opacity-50"
            >
              {isImporting ? (
                <ArrowPathIcon className="w-5 h-5 animate-spin" />
              ) : (
                <ArrowUpTrayIcon className="w-5 h-5 shrink-0" />
              )}
            </button>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`md:hidden relative flex-1 flex items-center justify-center gap-2 px-4 h-14 rounded-2xl font-bold border-2 transition-all ${
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

        {/* Panel de Acciones Masivas */}
        {showBulkActions && (
          <div className="mt-4 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 grid grid-cols-2 md:grid-cols-4 gap-3 animate-in slide-in-from-top-2 duration-300">
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
                const stockStr = prompt("¿Qué stock quieres fijar para todos los productos visibles?", "10");
                if (stockStr) applyBulkAdjustment("stock_fixed", parseInt(stockStr));
              }}
              className="flex flex-col items-center justify-center p-3 bg-white rounded-xl border border-indigo-100 hover:border-indigo-400 transition-colors shadow-sm"
            >
              <CheckCircleIcon className="w-4 h-4 text-indigo-600 mb-1" />
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-900">Fijar Stock</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="relative">
        {/* Desktop Table View */}
        <div className="hidden lg:block bg-white rounded-[2.5rem] shadow-2xl shadow-gray-200/40 border border-gray-50 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400 w-64 lg:w-80">Producto / SKU</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400 w-48">Categorías (Comas)</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400 w-32 text-right">Precio ($)</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400 w-32 text-right">Oferta ($)</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400 w-32 text-right">Stock Act.</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400 w-24 text-right">Mínimo</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400 w-24 text-right">Óptimo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredProducts.map((product) => (
                <EditableRow key={product.id} product={product} changes={editedChanges[product.id]} onChange={handleInputChange} />
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile/Tablet Card View */}
        <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredProducts.map((product) => (
            <EditableCard key={product.id} product={product} changes={editedChanges[product.id]} onChange={handleInputChange} />
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="py-24 md:py-32 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-gray-100">
            <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl">🔍</div>
            <p className="text-xl font-black text-gray-300 mb-1 tracking-widest uppercase">Sin productos</p>
            <p className="text-sm text-gray-400 font-medium italic">Prueba con términos más generales.</p>
          </div>
        )}
      </div>

      {/* Floating Bottom Bar (Mobile/Tablet) */}
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

      {/* Stats overlay (Desktop) */}
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

// ── Sub-components ──────────────────────────────────────────────────────

function EditableRow({ product, changes, onChange }: { product: any; changes?: ProductChanges; onChange: any }) {
  const isDirty = Object.keys(changes || {}).length > 0;

  return (
    <tr className={`hover:bg-emerald-50/10 transition-colors group ${isDirty ? "bg-emerald-50/5" : ""}`}>
      <td className="px-6 py-5">
        <div className="flex items-center gap-4">
          <div className="relative group-hover:scale-110 transition-transform shrink-0 hidden sm:block">
            {product.image ? (
              <img src={product.image} className="w-10 h-10 rounded-xl object-cover shadow-sm bg-white border border-gray-100" />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 text-xs">📦</div>
            )}
            {isDirty && <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full animate-pulse" />}
          </div>
          <div className="flex-1 min-w-0">
            <input
              type="text"
              value={changes?.name ?? product.name}
              onChange={(e) => onChange(product.id, "name", e.target.value)}
              className={`w-full text-sm font-bold leading-tight px-2 py-1 bg-transparent border-b-2 transition-all focus:outline-none focus:border-emerald-500 ${
                changes?.name !== undefined ? "border-emerald-500 text-emerald-700" : "border-transparent text-gray-800 hover:border-gray-300"
              }`}
            />
            <div className="flex items-center gap-2 px-2 mt-1">
              <span className="text-[9px] font-black text-gray-300 uppercase tracking-tighter">SKU: {product.id?.slice(0, 10)}</span>
              {product.barcode && (
                <span className="text-[9px] font-black text-emerald-400 uppercase tracking-tighter border-l pl-2">{product.barcode}</span>
              )}
            </div>
          </div>
        </div>
      </td>
      <td className="px-6 py-5">
        <input
          type="text"
          value={changes?.categories ? changes.categories.join(", ") : (product.categories || []).join(", ")}
          onChange={(e) => onChange(product.id, "categories", e.target.value)}
          placeholder="Categorías"
          className={`w-full px-2 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-[0.05em] transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${
            changes?.categories !== undefined
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-inner"
              : "bg-gray-100 text-gray-500 border border-transparent hover:bg-gray-200"
          }`}
        />
      </td>
      <td className="px-6 py-5 text-right w-32">
        <div className="inline-flex items-center relative w-full justify-end">
          <span className="absolute left-3 text-xs font-bold text-gray-400 pointer-events-none">$</span>
          <input
            type="number"
            inputMode="decimal"
            value={changes?.price ?? product.price}
            onChange={(e) => onChange(product.id, "price", e.target.value)}
            className={`w-full h-11 bg-white text-right font-black text-sm rounded-xl border-2 px-3 pl-6 focus:ring-4 focus:ring-emerald-500/10 transition-all ${
              changes?.price !== undefined ? "border-emerald-500 text-emerald-700" : "border-transparent text-gray-900 hover:border-gray-200 shadow-sm"
            }`}
          />
        </div>
      </td>
      <td className="px-6 py-5 text-right w-32">
        <div className="inline-flex items-center relative w-full justify-end">
          <span className="absolute left-3 text-xs font-bold text-gray-400 pointer-events-none">$</span>
          <input
            type="number"
            inputMode="decimal"
            placeholder="-"
            value={changes?.offerPrice !== undefined ? changes.offerPrice ?? "" : product.offerPrice || ""}
            onChange={(e) => onChange(product.id, "offerPrice", e.target.value)}
            className={`w-full h-11 bg-white text-right font-black text-sm rounded-xl border-2 px-3 pl-6 focus:ring-4 focus:ring-amber-500/10 transition-all ${
              changes?.offerPrice !== undefined && changes?.offerPrice !== null
                ? "border-amber-400 text-amber-700"
                : "border-transparent text-gray-900 hover:border-gray-200 shadow-sm bg-gray-50/50"
            }`}
          />
        </div>
      </td>
      <td className="px-6 py-5 text-right w-32">
        <div className="inline-flex items-center relative w-full justify-end">
          <input
            type="number"
            inputMode="numeric"
            value={changes?.stock ?? product.stock}
            onChange={(e) => onChange(product.id, "stock", e.target.value)}
            className={`w-full h-11 bg-white text-right font-black text-sm rounded-xl border-2 px-3 focus:ring-4 focus:ring-emerald-500/10 transition-all ${
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
      <td className="px-6 py-5 text-right w-24">
        <div className="inline-flex items-center relative w-full justify-end">
          <input
            type="number"
            inputMode="numeric"
            value={changes?.minStock ?? product.minStock}
            onChange={(e) => onChange(product.id, "minStock", e.target.value)}
            className={`w-full h-11 bg-white text-right font-black text-sm rounded-xl border-2 px-3 focus:ring-4 focus:ring-emerald-500/10 transition-all ${
              changes?.minStock !== undefined ? "border-emerald-500 text-emerald-700" : "border-transparent text-gray-600 hover:border-gray-200 shadow-sm"
            }`}
          />
        </div>
      </td>
      <td className="px-6 py-5 text-right w-24">
        <div className="inline-flex items-center relative w-full justify-end">
          <input
            type="number"
            inputMode="numeric"
            value={changes?.optimumStock ?? product.optimumStock}
            onChange={(e) => onChange(product.id, "optimumStock", e.target.value)}
            className={`w-full h-11 bg-white text-right font-black text-sm rounded-xl border-2 px-3 focus:ring-4 focus:ring-emerald-500/10 transition-all ${
              changes?.optimumStock !== undefined
                ? "border-emerald-500 text-emerald-700"
                : "border-transparent text-gray-600 hover:border-gray-200 shadow-sm"
            }`}
          />
        </div>
      </td>
    </tr>
  );
}

function EditableCard({ product, changes, onChange }: { product: any; changes?: ProductChanges; onChange: any }) {
  const isDirty = Object.keys(changes || {}).length > 0;

  return (
    <div
      className={`p-4 rounded-[2rem] border-2 transition-all ${
        isDirty ? "bg-emerald-50/30 border-emerald-500 shadow-lg shadow-emerald-500/5" : "bg-white border-gray-100 shadow-sm"
      }`}
    >
      <div className="flex items-start gap-3 mb-4">
        <div className="relative shrink-0 mt-1">
          {product.image ? (
            <img src={product.image} className="w-12 h-12 rounded-xl object-cover shadow-sm bg-white border border-gray-100" />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400">📦</div>
          )}
          {isDirty && (
            <div className="absolute -top-2 -right-2 bg-emerald-500 text-white p-1 rounded-full border-4 border-white shadow-lg">
              <CheckCircleIcon className="w-2 h-2" />
            </div>
          )}
        </div>
        <div className="flex-1 w-full min-w-0">
          <input
            type="text"
            value={changes?.name ?? product.name}
            onChange={(e) => onChange(product.id, "name", e.target.value)}
            className={`w-full text-sm font-black leading-tight bg-transparent border-b-2 pb-1 transition-all focus:outline-none focus:border-emerald-500 truncate ${
              changes?.name !== undefined ? "border-emerald-500 text-emerald-700" : "border-transparent text-gray-900 hover:border-gray-200"
            }`}
          />
          <p className="text-[10px] font-black text-gray-400 tracking-tighter uppercase truncate opacity-60 mt-1">SKU: {String(product.id).slice(0, 15)}</p>
          <input
            type="text"
            value={changes?.categories ? changes.categories.join(", ") : (product.categories || []).join(", ")}
            onChange={(e) => onChange(product.id, "categories", e.target.value)}
            placeholder="Categorías"
            className={`mt-2 w-full px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${
              changes?.categories !== undefined
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-gray-100 text-gray-500 border border-transparent hover:bg-gray-200"
            }`}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1.5">
          <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest px-1">Precio</label>
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400">$</span>
            <input
              type="number"
              inputMode="decimal"
              value={changes?.price ?? product.price}
              onChange={(e) => onChange(product.id, "price", e.target.value)}
              className={`w-full h-10 rounded-xl border border-gray-200 font-black text-xs pl-6 pr-2 shadow-inner ${
                changes?.price !== undefined
                  ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                  : "bg-gray-50 text-gray-900 focus-within:bg-white focus:border-emerald-500"
              }`}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-[8px] font-black text-amber-500/80 uppercase tracking-widest px-1">Oferta</label>
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400">$</span>
            <input
              type="number"
              inputMode="decimal"
              placeholder="-"
              value={changes?.offerPrice !== undefined ? changes.offerPrice ?? "" : product.offerPrice || ""}
              onChange={(e) => onChange(product.id, "offerPrice", e.target.value)}
              className={`w-full h-10 rounded-xl border border-gray-200 font-black text-xs pl-6 pr-2 shadow-inner ${
                changes?.offerPrice !== undefined && changes?.offerPrice !== null
                  ? "bg-amber-50 border-amber-300 text-amber-800"
                  : "bg-gray-50 text-gray-900 focus-within:bg-white focus:border-amber-500"
              }`}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest px-1">Stock</label>
          <div className="relative">
            <input
              type="number"
              inputMode="numeric"
              value={changes?.stock ?? product.stock}
              onChange={(e) => onChange(product.id, "stock", e.target.value)}
              className={`w-full h-10 rounded-xl border border-gray-200 font-black text-xs px-2 text-center shadow-inner ${
                changes?.stock !== undefined
                  ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                  : product.stock <= 5
                  ? "bg-red-50 border-red-300 text-red-700"
                  : "bg-gray-50 text-gray-900 focus-within:bg-white focus:border-emerald-500"
              }`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
