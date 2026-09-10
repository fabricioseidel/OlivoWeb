"use client";

import { useState, useMemo, useEffect, useRef, useCallback, useDeferredValue } from "react";
import { useProducts } from "@/contexts/ProductContext";
import { useCategories } from "@/contexts/CategoryContext";
import { hasRealImage, renameProductBarcode, saveProductsBulk } from "@/services/products";
import { uploadImageToCloudinaryServerAction } from "@/actions/upload";
import { useToast } from "@/contexts/ToastContext";
import { read, utils } from "xlsx";
import {
  COLUMN_MAP,
  MAX_BACKUPS,
  PAGE_SIZE,
  VIEW_KEY,
  SORT_KEY,
  addBackup,
  createBackup,
  isProductReady,
  getProductDiagnostics,
  loadBackups,
  normalizeHeader,
  saveBackups,
  type Backup,
  type ProductChanges,
  type SortPriority,
  type CompletenessTab,
  type SpecificFilter,
} from "./lib";
import PageHeader from "./components/PageHeader";
import HistoryPanel from "./components/HistoryPanel";
import FiltersToolbar from "./components/FiltersToolbar";
import SelectionToolbar from "./components/SelectionToolbar";
import ProductTable from "./components/ProductTable";
import ProductCardsGrid from "./components/ProductCardsGrid";
import MobileSaveBar from "./components/MobileSaveBar";

export default function BulkEditProductsPage() {
  const { products, updateProductsBulk, refresh } = useProducts();
  const { categories: allCategories } = useCategories();
  const { showToast } = useToast();

  const [searchTerm, setSearchTerm] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [editedChanges, setEditedChanges] = useState<Record<string, ProductChanges>>({});
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [filterWithImage, setFilterWithImage] = useState(false);
  const [sortPriority, setSortPriority] = useState<SortPriority>("near_ready");
  const [completenessTab, setCompletenessTab] = useState<CompletenessTab>("all");
  const [specificFilter, setSpecificFilter] = useState<SpecificFilter>("all");
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
    const s = localStorage.getItem(SORT_KEY) as SortPriority;
    if (s) setSortPriority(s);
  }, []);

  const changeViewMode = (v: "table" | "cards") => {
    setViewMode(v);
    localStorage.setItem(VIEW_KEY, v);
  };

  const changeSortPriority = (s: SortPriority) => {
    setSortPriority(s);
    localStorage.setItem(SORT_KEY, s);
  };

  const deferredSearch = useDeferredValue(searchTerm);

  // Conteo dinámico de productos por estado de preparación y faltantes específicos
  const { tabCounts, missingCounts } = useMemo(() => {
    const tc = { all: localProducts.length, missing_1: 0, missing_2: 0, missing_3_plus: 0, ready: 0 };
    const mc = {
      missing_photo: 0,
      missing_price: 0,
      missing_stock: 0,
      missing_cost: 0,
      missing_category: 0,
      missing_barcode: 0,
      inactive: 0,
    };

    for (const p of localProducts) {
      const diag = getProductDiagnostics(p, editedChanges[p.id]);
      if (diag.isReady) tc.ready++;
      else if (diag.missingCount === 1) tc.missing_1++;
      else if (diag.missingCount === 2) tc.missing_2++;
      else tc.missing_3_plus++;

      if (!diag.hasImage) mc.missing_photo++;
      if (!diag.hasPrice) mc.missing_price++;
      if (!diag.hasStock) mc.missing_stock++;
      if (!diag.hasCost) mc.missing_cost++;
      if (!diag.hasCategories) mc.missing_category++;
      if (!diag.hasBarcode) mc.missing_barcode++;
      if (!diag.isActive) mc.inactive++;
    }

    return { tabCounts: tc, missingCounts: mc };
  }, [localProducts, editedChanges]);

  const filteredProducts = useMemo(() => {
    const term = deferredSearch.toLowerCase();
    const catFilter = categoryFilter.toLowerCase();
    const result = localProducts.filter((p) => {
      const diag = getProductDiagnostics(p, editedChanges[p.id]);

      const matchesSearch =
        p.name.toLowerCase().includes(term) ||
        p.id?.toLowerCase().includes(term) ||
        p.barcode?.toLowerCase().includes(term);
      if (!matchesSearch) return false;

      const pStock = editedChanges[p.id]?.stock ?? p.stock;
      if (filterLowStock && pStock > 5) return false;
      if (filterWithImage && !diag.hasImage) return false;

      if (catFilter) {
        const pCats = editedChanges[p.id]?.categories ?? p.categories ?? [];
        if (!pCats.some((c: string) => c.toLowerCase() === catFilter)) return false;
      }

      // Pestaña de completitud
      if (completenessTab === "missing_1" && diag.missingCount !== 1) return false;
      if (completenessTab === "missing_2" && diag.missingCount !== 2) return false;
      if (completenessTab === "missing_3_plus" && diag.missingCount < 3) return false;
      if (completenessTab === "ready" && !diag.isReady) return false;

      // Filtro específico por faltante
      if (specificFilter === "missing_photo" && diag.hasImage) return false;
      if (specificFilter === "missing_price" && diag.hasPrice) return false;
      if (specificFilter === "missing_stock" && diag.hasStock) return false;
      if (specificFilter === "missing_cost" && diag.hasCost) return false;
      if (specificFilter === "missing_category" && diag.hasCategories) return false;
      if (specificFilter === "missing_barcode" && diag.hasBarcode) return false;
      if (specificFilter === "inactive" && diag.isActive) return false;

      return true;
    });

    // Ordenamiento según prioridad seleccionada
    return result.sort((a, b) => {
      const diagA = getProductDiagnostics(a, editedChanges[a.id]);
      const diagB = getProductDiagnostics(b, editedChanges[b.id]);

      if (sortPriority === "near_ready") {
        // Casi listos primero: 1 faltante, luego 2, luego 3... y al final los que ya están listos
        const scoreA = diagA.isReady ? 999 : diagA.missingCount;
        const scoreB = diagB.isReady ? 999 : diagB.missingCount;
        if (scoreA !== scoreB) return scoreA - scoreB;
        return a.name.localeCompare(b.name);
      }
      if (sortPriority === "most_incomplete") {
        const scoreA = diagA.isReady ? -1 : diagA.missingCount;
        const scoreB = diagB.isReady ? -1 : diagB.missingCount;
        if (scoreA !== scoreB) return scoreB - scoreA;
        return a.name.localeCompare(b.name);
      }
      if (sortPriority === "ready_first") {
        return (diagB.isReady ? 1 : 0) - (diagA.isReady ? 1 : 0);
      }
      if (sortPriority === "name_asc") {
        return a.name.localeCompare(b.name);
      }
      if (sortPriority === "name_desc") {
        return b.name.localeCompare(a.name);
      }
      if (sortPriority === "stock_asc") {
        const sA = editedChanges[a.id]?.stock ?? a.stock ?? 0;
        const sB = editedChanges[b.id]?.stock ?? b.stock ?? 0;
        return sA - sB;
      }
      if (sortPriority === "price_asc") {
        const pA = editedChanges[a.id]?.price ?? a.price ?? 0;
        const pB = editedChanges[b.id]?.price ?? b.price ?? 0;
        return pA - pB;
      }
      if (sortPriority === "price_desc") {
        const pA = editedChanges[a.id]?.price ?? a.price ?? 0;
        const pB = editedChanges[b.id]?.price ?? b.price ?? 0;
        return pB - pA;
      }
      return 0;
    });
  }, [
    localProducts,
    deferredSearch,
    filterLowStock,
    filterWithImage,
    categoryFilter,
    completenessTab,
    specificFilter,
    sortPriority,
    editedChanges,
  ]);

  const visibleProducts = useMemo(
    () => filteredProducts.slice(0, visibleCount),
    [filteredProducts, visibleCount]
  );

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [deferredSearch, filterLowStock, filterWithImage, completenessTab, specificFilter, categoryFilter, sortPriority, viewMode]);

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
    } else if (field === "purchasePrice") {
      newValue = value === "" ? 0 : parseFloat(value as string);
      originalValue = originalProduct?.purchasePrice ?? 0;
    } else if (field === "isActive") {
      newValue = Boolean(value);
      originalValue = originalProduct?.isActive !== false;
    } else if (field === "image") {
      newValue = value as string;
      originalValue = originalProduct?.image;
    } else if (field === "stock" || field === "minStock" || field === "optimumStock") {
      newValue = parseInt(value as string, 10);
      originalValue = field === "stock" ? originalProduct?.stock : field === "minStock" ? originalProduct?.minStock : originalProduct?.optimumStock;
    } else if (field === "name") {
      newValue = value;
      originalValue = originalProduct?.name;
    } else if (field === "barcode") {
      newValue = (value as string).trim();
      originalValue = originalProduct?.barcode ?? "";
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
      (field === "purchasePrice" && isNaN(newValue)) ||
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

  const applyBulkAdjustment = (type: "price_percent" | "price_fixed" | "stock_fixed" | "cost_fixed", value: number) => {
    const newChanges = { ...editedChanges };
    const targets = getBulkTargets();

    targets.forEach((product) => {
      const currentPrice = newChanges[product.id]?.price ?? product.price;
      const currentStock = newChanges[product.id]?.stock ?? product.stock;
      const currentCost = newChanges[product.id]?.purchasePrice ?? product.purchasePrice ?? 0;

      let nextPrice = currentPrice;
      let nextStock = currentStock;
      let nextCost = currentCost;

      if (type === "price_percent") {
        nextPrice = Math.round(currentPrice * (1 + value / 100));
      } else if (type === "price_fixed") {
        nextPrice = currentPrice + value;
      } else if (type === "stock_fixed") {
        nextStock = value;
      } else if (type === "cost_fixed") {
        nextCost = value;
      }

      const changedPrice = nextPrice !== product.price;
      const changedStock = nextStock !== product.stock;
      const changedCost = nextCost !== (product.purchasePrice ?? 0);

      if (changedPrice || changedStock || changedCost) {
        newChanges[product.id] = {
          ...newChanges[product.id],
          ...(changedPrice ? { price: nextPrice } : {}),
          ...(changedStock ? { stock: nextStock } : {}),
          ...(changedCost ? { purchasePrice: nextCost } : {}),
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

  const toggleActiveTargetsBulk = (active: boolean) => {
    const targets = getBulkTargets();
    const newChanges = { ...editedChanges };
    let count = 0;
    targets.forEach((p) => {
      const currentActive =
        newChanges[p.id]?.isActive !== undefined ? newChanges[p.id].isActive : p.isActive !== false;
      if (currentActive === active) return;
      newChanges[p.id] = { ...newChanges[p.id], isActive: active };
      count++;
    });
    setEditedChanges(newChanges);
    showToast(
      count > 0
        ? `${count} productos marcados como ${active ? "Activos (en vitrina)" : "Ocultos"} (pendiente guardar)`
        : `Los productos objetivo ya están ${active ? "activos" : "ocultos"}`,
      count > 0 ? "success" : "info"
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
      // 1. Subir imágenes nuevas (en base64) a Cloudinary antes de persistir
      for (const id of targetIds) {
        const ch = editedChanges[id];
        if (ch?.image && ch.image.startsWith("data:image")) {
          try {
            const res = await uploadImageToCloudinaryServerAction(ch.image);
            if (res.ok && res.url) {
              ch.image = res.url;
            } else {
              throw new Error(res.error || "Error al subir imagen");
            }
          } catch (imgErr: any) {
            console.error(`Error subiendo imagen para ${id}:`, imgErr);
            showToast(`Error al subir imagen de producto: ${imgErr?.message || "error desconocido"}`, "error");
          }
        }
      }

      // El barcode es el identificador de negocio (onConflict:'barcode' en el
      // upsert), así que un cambio de barcode no puede viajar por el mismo
      // camino que el resto de los campos: en vez de renombrar la fila
      // existente, el upsert crearía una fila nueva con el barcode nuevo y
      // dejaría huérfana la original. Se resuelve aparte con un UPDATE real
      // (rename-barcode). Además, para los productos renombrados, el resto
      // de sus campos NO puede pasar por updateProductsBulk: esa función
      // busca el producto existente en la caché del contexto por su id
      // (barcode) actual, que en ese momento todavía es el viejo, así que
      // se arma el payload a mano con los datos ya conocidos localmente.
      const plainChanges: Record<string, ProductChanges> = {};
      const renamedPayloads: (Partial<import("@/types").SupaProduct> & { barcode: string })[] = [];
      const renameFailures: string[] = [];
      let renamedCount = 0;

      for (const id of targetIds) {
        const { barcode: newBarcode, ...rest } = editedChanges[id];
        if (newBarcode === undefined) {
          plainChanges[id] = rest;
          continue;
        }

        try {
          await renameProductBarcode(id, newBarcode);
          renamedCount++;
          const original = localProducts.find((p) => p.id === id);
          if (original && Object.keys(rest).length > 0) {
            const merged = { ...original, ...rest };
            // El stock solo viaja si esta edición lo tocó. `merged.stock` es
            // el valor cacheado en el navegador: mandarlo siempre forzaba un
            // ajuste de inventario a una cifra vieja cada vez que se
            // renombraba un código de barras.
            const stockEdit =
              (rest as { stock?: number }).stock === undefined
                ? {}
                : { stock: Number((rest as { stock?: number }).stock) };
            renamedPayloads.push({
              barcode: newBarcode,
              ...stockEdit,
              name: merged.name,
              category: Array.isArray(merged.categories) ? merged.categories.join(", ") : "",
              purchase_price: Number((merged as any).purchasePrice ?? (original as any).purchasePrice ?? 0),
              sale_price: Number(merged.price ?? 0),
              image_url: (merged as any).image ?? (original as any).image,
              gallery: (original as any).gallery,
              featured: (original as any).featured,
              is_active: (merged as any).isActive !== undefined ? (merged as any).isActive : (original as any).isActive,
              measurement_unit: (original as any).measurementUnit,
              measurement_value: (original as any).measurementValue,
              suggested_price: (original as any).suggestedPrice,
              offer_price: merged.offerPrice ?? undefined,
              description: merged.description,
              min_stock: Number(merged.minStock ?? 5),
              optimum_stock: Number(merged.optimumStock ?? 20),
            });
          }
        } catch (err: any) {
          renameFailures.push(`${id} → ${newBarcode}: ${err?.message || "error desconocido"}`);
          // El rename falló: la fila sigue bajo el barcode viejo, así que el
          // resto de los campos (si los hay) se guardan normalmente ahí, y
          // el intento de barcode queda pendiente para reintentar.
          plainChanges[id] = { ...rest, barcode: newBarcode };
        }
      }

      if (Object.keys(plainChanges).length > 0) {
        await updateProductsBulk(plainChanges as any);
      }
      if (renamedPayloads.length > 0) {
        await saveProductsBulk(renamedPayloads);
      }
      // updateProductsBulk ya refresca por su cuenta, pero corre antes de
      // guardar renamedPayloads (que no pasa por el contexto) — se refresca
      // siempre al final para que la lista quede consistente con todo lo guardado.
      if (renamedCount > 0 || renamedPayloads.length > 0) {
        await refresh();
      }

      if (renameFailures.length > 0) {
        showToast(
          `${renamedCount > 0 ? `${renamedCount} código(s) renombrado(s). ` : ""}${renameFailures.length} código(s) no se pudieron renombrar: ${renameFailures.join("; ")}`,
          "error"
        );
      } else {
        showToast(`¡${updateCount} productos actualizados con éxito!`, "success");
      }

      // Los productos con rename fallido quedan con su cambio de barcode
      // visible (para reintentar); el resto se limpia.
      setEditedChanges((prev) => {
        const next: Record<string, ProductChanges> = {};
        for (const id of Object.keys(prev)) {
          if (renameFailures.some((f) => f.startsWith(`${id} →`))) {
            next[id] = { barcode: prev[id].barcode };
          }
        }
        return next;
      });
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
        sortPriority={sortPriority}
        setSortPriority={changeSortPriority}
        completenessTab={completenessTab}
        setCompletenessTab={setCompletenessTab}
        specificFilter={specificFilter}
        setSpecificFilter={setSpecificFilter}
        filterLowStock={filterLowStock}
        setFilterLowStock={setFilterLowStock}
        filterWithImage={filterWithImage}
        setFilterWithImage={setFilterWithImage}
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
        tabCounts={tabCounts}
        missingCounts={missingCounts}
        applyBulkAdjustment={applyBulkAdjustment}
        bulkCategory={bulkCategory}
        setBulkCategory={setBulkCategory}
        assignCategoryToTargets={assignCategoryToTargets}
        toggleActiveTargetsBulk={toggleActiveTargetsBulk}
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
              className="px-8 h-12 rounded-2xl bg-white border-2 border-gray-200 hover:border-brand-400 font-black text-xs uppercase tracking-widest text-gray-500 hover:text-brand-600 transition-colors shadow-sm"
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
          <span className="w-2 h-2 rounded-full bg-brand-500" /> Cambios detectados
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
