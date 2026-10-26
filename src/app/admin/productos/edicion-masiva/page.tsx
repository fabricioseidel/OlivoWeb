"use client";

import { useState, useMemo, useEffect, useRef, useCallback, useDeferredValue } from "react";
import { useSession } from "next-auth/react";
import { useProducts } from "@/contexts/ProductContext";
import { useCategories } from "@/contexts/CategoryContext";
import { fetchAllProducts, renameProductBarcode, saveProductsBulk } from "@/services/products";
import { uploadImageToCloudinaryServerAction } from "@/actions/upload";
import { useToast } from "@/contexts/ToastContext";
import {
  EXPORT_COLUMNS,
  MAX_BACKUPS,
  PAGE_SIZE,
  VIEW_KEY,
  SORT_KEY,
  addBackup,
  applyPatch,
  buildImportPlan,
  createBackup,
  diffSnapshot,
  findConflicts,
  getProductDiagnostics,
  loadBackups,
  loadDismissedDuplicates,
  mapWithConcurrency,
  parseLocaleNumber,
  saveBackups,
  saveDismissedDuplicates,
  summarizeChanges,
  buildMergePlan,
  findDuplicateGroups,
  getPublishPriority,
  getStock,
  getVerifiedAt,
  isRecentlyCounted,
  type Backup,
  type ChangesSummary,
  type DuplicateGroup,
  type ImportPlan,
  type ProductChanges,
  type ProductDiagnostics,
  type SaveConflict,
  type SortPriority,
  type CompletenessTab,
  type StockFilter,
  type MissingFilter,
} from "./lib";
import PageHeader from "./components/PageHeader";
import HistoryPanel from "./components/HistoryPanel";
import FiltersToolbar, { type BulkAction } from "./components/FiltersToolbar";
import SelectionToolbar from "./components/SelectionToolbar";
import ProductTable from "./components/ProductTable";
import ProductCardsGrid from "./components/ProductCardsGrid";
import MobileSaveBar from "./components/MobileSaveBar";
import DuplicatesPanel from "./components/DuplicatesPanel";
import ActionDialog, { type DialogRequest } from "./components/ActionDialog";

type ChangesMap = Record<string, ProductChanges>;

const SORT_OPTIONS: SortPriority[] = [
  "stock_real",
  "near_ready",
  "most_incomplete",
  "ready_first",
  "name_asc",
  "name_desc",
  "stock_asc",
  "stock_desc",
  "price_asc",
  "price_desc",
];

const FIELD_LABELS: Record<keyof ProductChanges, string> = {
  price: "precio",
  offerPrice: "oferta",
  purchasePrice: "costo",
  stock: "stock",
  minStock: "stock mínimo",
  optimumStock: "stock óptimo",
  name: "nombre",
  barcode: "código",
  categories: "categorías",
  description: "descripción",
  image: "foto",
  isActive: "vitrina",
};

const INTEGER_FIELDS: (keyof ProductChanges)[] = ["stock", "minStock", "optimumStock"];

function plural(n: number, uno: string, varios: string) {
  return `${n} ${n === 1 ? uno : varios}`;
}

function normalizeSearch(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function FieldCounts({ counts }: { counts: Partial<Record<keyof ProductChanges, number>> }) {
  const entries = Object.entries(counts) as [keyof ProductChanges, number][];
  if (entries.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {entries.map(([k, n]) => (
        <span key={k} className="px-2 py-0.5 rounded-lg bg-gray-100 text-gray-700 text-xs font-bold">
          {FIELD_LABELS[k]} · {n}
        </span>
      ))}
    </div>
  );
}

function ShortList({ items, more }: { items: React.ReactNode[]; more: number }) {
  return (
    <ul className="text-xs space-y-0.5 pl-4 list-disc">
      {items}
      {more > 0 && <li className="list-none -ml-4 text-gray-500">y {more} más…</li>}
    </ul>
  );
}

function SaveSummary({
  count,
  summary,
  conflicts,
  verified,
}: {
  count: number;
  summary: ChangesSummary;
  conflicts: SaveConflict[];
  verified: boolean;
}) {
  return (
    <>
      <p>
        Se guardarán <b>{plural(count, "producto", "productos")}</b>. Cambios por campo:
      </p>
      <FieldCounts counts={summary.fieldCounts} />

      {summary.renames.length > 0 && (
        <div className="rounded-xl bg-violet-50 border border-violet-200 p-2.5">
          <p className="font-bold text-violet-800 text-xs mb-1">Códigos de barras que se renombran:</p>
          <ShortList
            items={summary.renames.slice(0, 5).map((r) => (
              <li key={r.id}>
                {r.name}: <span className="font-mono">{r.id}</span> → <span className="font-mono">{r.to || "(vacío)"}</span>
              </li>
            ))}
            more={summary.renames.length - 5}
          />
        </div>
      )}

      {summary.warnings.length > 0 && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-2.5">
          <p className="font-bold text-rose-800 text-xs mb-1">⚠ Revisa estos precios:</p>
          <ShortList
            items={summary.warnings.slice(0, 5).map((w) => (
              <li key={w.id}>
                {w.name}: {w.warnings.join(", ")}
              </li>
            ))}
            more={summary.warnings.length - 5}
          />
        </div>
      )}

      {conflicts.length > 0 && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-2.5">
          <p className="font-bold text-amber-800 text-xs mb-1">
            ⚠ Alguien cambió estos datos después de que abriste la página. Guardar los reemplaza con tus valores:
          </p>
          <ShortList
            items={conflicts.slice(0, 5).map((c) => (
              <li key={`${c.id}-${c.field}`}>
                {c.name}: {c.field}
              </li>
            ))}
            more={conflicts.length - 5}
          />
        </div>
      )}

      {!verified && (
        <p className="text-xs font-bold text-amber-700">
          No se pudo verificar si otra persona cambió algo mientras editabas; se guardará igual.
        </p>
      )}
      <p className="text-xs text-gray-500">Antes de guardar se crea un backup en el Historial de este navegador.</p>
    </>
  );
}

function ImportSummary({ plan, fileName }: { plan: ImportPlan; fileName: string }) {
  return (
    <>
      <p>
        <b>{fileName}</b>: {plural(plan.matched, "producto con cambios", "productos con cambios")}. Quedan como cambios
        pendientes; nada se guarda hasta apretar Guardar.
      </p>
      <FieldCounts counts={plan.fieldCounts} />
      {plan.unmatched > 0 && (
        <p className="text-xs">
          <b>{plural(plan.unmatched, "fila", "filas")}</b> sin producto con ese código (se ignoran):{" "}
          <span className="font-mono">{plan.unmatchedCodes.join(", ")}</span>
          {plan.unmatched > plan.unmatchedCodes.length ? "…" : ""}
        </p>
      )}
      {plan.invalid.length > 0 && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-2.5">
          <p className="font-bold text-rose-800 text-xs mb-1">
            {plural(plan.invalid.length, "valor no válido", "valores no válidos")} (se ignoran):
          </p>
          <ShortList items={plan.invalid.slice(0, 5).map((m) => <li key={m}>{m}</li>)} more={plan.invalid.length - 5} />
        </div>
      )}
      {plan.ignoredColumns.length > 0 && (
        <p className="text-xs text-gray-500">Columnas no reconocidas: {plan.ignoredColumns.join(", ")}.</p>
      )}
    </>
  );
}

export default function BulkEditProductsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const rol = String((session as any)?.role ?? (session as any)?.user?.role ?? "").toUpperCase();
  const { products, updateProductsBulk, refresh } = useProducts();
  const { categories: allCategories } = useCategories();
  const { showToast } = useToast();

  // Las callbacks que bajan a las filas memorizadas leen esto por ref para
  // ser estables: si cambiaran en cada render, las 60 filas se redibujarían
  // con cada tecla.
  const toastRef = useRef(showToast);
  toastRef.current = showToast;

  const [searchTerm, setSearchTerm] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [editedChanges, setEditedChanges] = useState<ChangesMap>({});
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [sortPriority, setSortPriority] = useState<SortPriority>("stock_real");
  const [completenessTab, setCompletenessTab] = useState<CompletenessTab>("all");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [missingFilter, setMissingFilter] = useState<MissingFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [bulkCategory, setBulkCategory] = useState("");
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [dismissedDuplicates, setDismissedDuplicates] = useState<Set<string>>(new Set());
  const [backups, setBackups] = useState<Backup[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [dialog, setDialog] = useState<DialogRequest | null>(null);
  const closeDialog = useCallback(() => setDialog(null), []);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editedRef = useRef(editedChanges);
  editedRef.current = editedChanges;

  const [localProducts, setLocalProducts] = useState(products);
  useEffect(() => {
    setLocalProducts(products);
  }, [products]);

  const productsById = useMemo(() => new Map(localProducts.map((p) => [String(p.id), p])), [localProducts]);
  const productsByIdRef = useRef(productsById);
  productsByIdRef.current = productsById;

  useEffect(() => {
    setBackups(loadBackups());
    setDismissedDuplicates(loadDismissedDuplicates());
    try {
      const v = localStorage.getItem(VIEW_KEY);
      if (v === "cards" || v === "table") setViewMode(v);
      const s = localStorage.getItem(SORT_KEY) as SortPriority;
      if (s && SORT_OPTIONS.includes(s)) setSortPriority(s);
    } catch {
      // Sin localStorage se usan los valores por defecto.
    }
  }, []);

  const changeViewMode = (v: "table" | "cards") => {
    setViewMode(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {}
  };

  const changeSortPriority = (s: SortPriority) => {
    setSortPriority(s);
    try {
      localStorage.setItem(SORT_KEY, s);
    } catch {}
  };

  const deferredSearch = useDeferredValue(searchTerm);
  const hasChanges = Object.keys(editedChanges).length > 0;
  const changedCount = Object.keys(editedChanges).length;

  // ── Aviso al salir con cambios sin guardar ───────────────────────
  //
  // `beforeunload` cubre recargar o cerrar la pestaña; los enlaces del menú
  // navegan dentro de la app sin recargar, así que se interceptan los clics.
  useEffect(() => {
    if (!hasChanges) return;
    const mensaje = `Tienes ${plural(changedCount, "producto", "productos")} con cambios sin guardar. ¿Salir y descartarlos?`;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return;
      if (!window.confirm(mensaje)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [hasChanges, changedCount]);

  // ── Duplicados ───────────────────────────────────────────────────
  //
  // Se calculan sobre el catálogo entero, no sobre lo filtrado: un duplicado
  // sólo se ve comparando las dos filas, y casi siempre una de ellas está
  // fuera del filtro con el que se está trabajando.
  const duplicateGroups = useMemo(() => findDuplicateGroups(localProducts), [localProducts]);

  // Los grupos ya revisados ("no son el mismo") o ya unificados salen de la
  // cuenta: lo que queda es trabajo pendiente de verdad.
  const pendingDuplicateGroups = useMemo(
    () => duplicateGroups.filter((g) => !dismissedDuplicates.has(g.id)),
    [duplicateGroups, dismissedDuplicates]
  );

  const duplicateIds = useMemo(() => {
    const ids = new Set<string>();
    for (const g of pendingDuplicateGroups) {
      ids.add(String(g.keeper.id));
      for (const o of g.others) ids.add(String(o.id));
    }
    return ids;
  }, [pendingDuplicateGroups]);

  // ── Diagnóstico, filtros y orden ─────────────────────────────────
  //
  // El diagnóstico de cada producto con sus datos guardados se calcula una
  // vez por carga del catálogo, no en cada tecla.
  const baseDiag = useMemo(() => {
    const m = new Map<string, ProductDiagnostics>();
    for (const p of localProducts) m.set(String(p.id), getProductDiagnostics(p));
    return m;
  }, [localProducts]);

  const searchKeys = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of localProducts) m.set(String(p.id), normalizeSearch(`${p.name ?? ""} ${p.id ?? ""} ${p.barcode ?? ""}`));
    return m;
  }, [localProducts]);

  // Los contadores sí reflejan lo que se va editando: bajan a medida que se
  // completa, como indicador de avance.
  const { tabCounts, missingCounts, readyCount } = useMemo(() => {
    const tc = { all: localProducts.length, missing_1: 0, missing_2: 0, missing_3_plus: 0, complete: 0 };
    const mc = {
      with_stock: 0,
      counted: 0,
      counted_today: 0,
      uncounted: 0,
      duplicates: duplicateIds.size,
      missing_photo: 0,
      missing_price: 0,
      missing_stock: 0,
      missing_cost: 0,
      missing_category: 0,
      missing_barcode: 0,
      inactive: 0,
      low_stock: 0,
    };
    let ready = 0;
    const ahora = Date.now();

    for (const p of localProducts) {
      const ch = editedChanges[p.id];
      const diag = ch ? getProductDiagnostics(p, ch) : baseDiag.get(String(p.id))!;
      if (diag.isReady) ready++;
      if (diag.missingDataCount === 0) tc.complete++;
      else if (diag.missingDataCount === 1) tc.missing_1++;
      else if (diag.missingDataCount === 2) tc.missing_2++;
      else tc.missing_3_plus++;

      const stock = getStock(p, ch);
      if (stock > 0) mc.with_stock++;
      if (stock <= 5) mc.low_stock++;
      if (getVerifiedAt(p) !== null) mc.counted++;
      else mc.uncounted++;
      if (isRecentlyCounted(p, ahora)) mc.counted_today++;

      if (!diag.hasImage) mc.missing_photo++;
      if (!diag.hasPrice) mc.missing_price++;
      if (!diag.hasStock) mc.missing_stock++;
      if (!diag.hasCost) mc.missing_cost++;
      if (!diag.hasCategories) mc.missing_category++;
      if (!diag.hasBarcode) mc.missing_barcode++;
      if (!diag.isActive) mc.inactive++;
    }

    return { tabCounts: tc, missingCounts: mc, readyCount: ready };
  }, [localProducts, editedChanges, baseDiag, duplicateIds]);

  // Filtrar y ordenar se hace con los datos GUARDADOS, no con lo que se está
  // escribiendo. Antes, con "Falta precio" activo, el primer dígito ya le
  // ponía precio al producto: la fila desaparecía a mitad de escribir, se
  // perdía el foco y quedaba guardado "1" en vez de "1500". Ahora la fila se
  // queda en su lugar hasta guardar, y la lista no se reordena bajo el cursor.
  const filteredProducts = useMemo(() => {
    const term = normalizeSearch(deferredSearch.trim());
    const catFilter = categoryFilter.toLowerCase();
    const ahora = Date.now();
    const result = localProducts.filter((p) => {
      const id = String(p.id);
      const diag = baseDiag.get(id)!;

      if (term && !searchKeys.get(id)?.includes(term)) return false;

      const stock = getStock(p);
      if (filterLowStock && stock > 5) return false;

      if (catFilter) {
        const pCats: string[] = p.categories ?? [];
        if (!pCats.some((c) => c.toLowerCase() === catFilter)) return false;
      }

      if (completenessTab === "missing_1" && diag.missingDataCount !== 1) return false;
      if (completenessTab === "missing_2" && diag.missingDataCount !== 2) return false;
      if (completenessTab === "missing_3_plus" && diag.missingDataCount < 3) return false;
      if (completenessTab === "complete" && diag.missingDataCount !== 0) return false;

      if (stockFilter === "with_stock" && stock <= 0) return false;
      if (stockFilter === "counted" && getVerifiedAt(p) === null) return false;
      if (stockFilter === "counted_today" && !isRecentlyCounted(p, ahora)) return false;
      if (stockFilter === "uncounted" && getVerifiedAt(p) !== null) return false;
      if (stockFilter === "duplicates" && !duplicateIds.has(id)) return false;

      if (missingFilter === "missing_photo" && diag.hasImage) return false;
      if (missingFilter === "missing_price" && diag.hasPrice) return false;
      if (missingFilter === "missing_stock" && diag.hasStock) return false;
      if (missingFilter === "missing_cost" && diag.hasCost) return false;
      if (missingFilter === "missing_category" && diag.hasCategories) return false;
      if (missingFilter === "missing_barcode" && diag.hasBarcode) return false;
      if (missingFilter === "inactive" && diag.isActive) return false;

      return true;
    });

    const d = (p: any) => baseDiag.get(String(p.id))!;
    return result.sort((a, b) => {
      const diagA = d(a);
      const diagB = d(b);

      if (sortPriority === "stock_real") {
        // Lo que hay de verdad, primero: contado y con stock. Dentro de cada
        // tramo, los que están más cerca de poder publicarse.
        const prioA = getPublishPriority(a);
        const prioB = getPublishPriority(b);
        if (prioA !== prioB) return prioA - prioB;
        const faltaA = diagA.isReady ? -1 : diagA.missingCount;
        const faltaB = diagB.isReady ? -1 : diagB.missingCount;
        if (faltaA !== faltaB) return faltaA - faltaB;
        const stockA = getStock(a);
        const stockB = getStock(b);
        if (stockA !== stockB) return stockB - stockA;
        return a.name.localeCompare(b.name);
      }
      if (sortPriority === "near_ready") {
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
        const r = (diagB.isReady ? 1 : 0) - (diagA.isReady ? 1 : 0);
        return r !== 0 ? r : a.name.localeCompare(b.name);
      }
      if (sortPriority === "name_asc") return a.name.localeCompare(b.name);
      if (sortPriority === "name_desc") return b.name.localeCompare(a.name);
      if (sortPriority === "stock_asc") return getStock(a) - getStock(b);
      if (sortPriority === "stock_desc") {
        const diff = getStock(b) - getStock(a);
        return diff !== 0 ? diff : a.name.localeCompare(b.name);
      }
      if (sortPriority === "price_asc") return Number(a.price ?? 0) - Number(b.price ?? 0);
      if (sortPriority === "price_desc") return Number(b.price ?? 0) - Number(a.price ?? 0);
      return 0;
    });
  }, [
    localProducts,
    baseDiag,
    searchKeys,
    deferredSearch,
    filterLowStock,
    categoryFilter,
    completenessTab,
    stockFilter,
    missingFilter,
    sortPriority,
    duplicateIds,
  ]);

  const visibleProducts = useMemo(() => filteredProducts.slice(0, visibleCount), [filteredProducts, visibleCount]);
  const visibleRef = useRef(visibleProducts);
  visibleRef.current = visibleProducts;

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [deferredSearch, filterLowStock, completenessTab, stockFilter, missingFilter, categoryFilter, sortPriority, viewMode]);

  const hasActiveFilters =
    stockFilter !== "all" ||
    missingFilter !== "all" ||
    filterLowStock ||
    Boolean(categoryFilter) ||
    Boolean(searchTerm) ||
    completenessTab !== "all";

  const clearFilters = () => {
    setStockFilter("all");
    setMissingFilter("all");
    setCompletenessTab("all");
    setFilterLowStock(false);
    setCategoryFilter("");
    setSearchTerm("");
  };

  // ── Selección ────────────────────────────────────────────────────

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const allVisibleSelected = visibleProducts.length > 0 && visibleProducts.every((p) => selectedIds.has(p.id));

  const toggleAllVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) visibleProducts.forEach((p) => next.delete(p.id));
      else visibleProducts.forEach((p) => next.add(p.id));
      return next;
    });
  };

  const selectAllVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      visibleProducts.forEach((p) => next.add(p.id));
      return next;
    });
  };

  // ── Edición ──────────────────────────────────────────────────────

  const handleInputChange = useCallback((productId: string, field: keyof ProductChanges, value: string | string[]) => {
    const product = productsByIdRef.current.get(String(productId));
    if (!product) return;

    let v: any = value;
    if (field === "price" || INTEGER_FIELDS.includes(field)) {
      if (value === "") return;
      v = Number(value);
      if (!Number.isFinite(v) || v < 0) return;
    } else if (field === "offerPrice") {
      v = value === "" ? null : Number(value);
      if (v !== null && (!Number.isFinite(v) || v < 0)) return;
      if (v === 0) v = null;
    } else if (field === "purchasePrice") {
      v = value === "" ? 0 : Number(value);
      if (!Number.isFinite(v) || v < 0) return;
    } else if (field === "isActive") {
      v = Boolean(value);
    } else if (field === "barcode") {
      v = String(value).trim();
    } else if (field === "categories") {
      v = typeof value === "string" ? value.split(",").map((s) => s.trim()).filter(Boolean) : value;
    }

    setEditedChanges((prev) => {
      const next = { ...prev };
      applyPatch(next, product, { [field]: v });
      return next;
    });
  }, []);

  const revertProduct = useCallback((productId: string) => {
    setEditedChanges((prev) => {
      if (!prev[productId]) return prev;
      const next = { ...prev };
      delete next[productId];
      return next;
    });
  }, []);

  // Pegar una columna copiada de Excel: el primer valor va a la fila donde se
  // pegó y los siguientes a las filas de abajo, en el orden en que se ven.
  const pasteColumn = useCallback(
    (startId: string, field: keyof ProductChanges, values: string[]) => {
      const list = visibleRef.current;
      const start = list.findIndex((p) => p.id === startId);
      if (start === -1) return;
      const allowEmpty = field === "offerPrice" || field === "purchasePrice";
      let applied = 0;
      let invalid = 0;
      values.forEach((raw, i) => {
        const p = list[start + i];
        if (!p) return;
        if (raw === "") {
          if (allowEmpty) {
            handleInputChange(p.id, field, "");
            applied++;
          }
          return;
        }
        const n = parseLocaleNumber(raw);
        if (n === null || n < 0 || (INTEGER_FIELDS.includes(field) && !Number.isInteger(n))) {
          invalid++;
          return;
        }
        handleInputChange(p.id, field, String(n));
        applied++;
      });
      const sinFila = Math.max(0, start + values.length - list.length);
      toastRef.current(
        `${plural(applied, "valor pegado", "valores pegados")} en ${FIELD_LABELS[field]}` +
          (invalid ? ` · ${plural(invalid, "no válido", "no válidos")}` : "") +
          (sinFila ? ` · ${sinFila} sin fila` : "") +
          " (pendiente guardar)",
        invalid || sinFila ? "warning" : "success"
      );
    },
    [handleInputChange]
  );

  // ── Acciones masivas ─────────────────────────────────────────────
  //
  // Se aplican a la selección si hay productos seleccionados; si no, a todos
  // los filtrados. Siempre se confirman mostrando a cuántos afectan, y quedan
  // como cambios pendientes.

  const getBulkTargets = () =>
    selectedIds.size > 0 ? filteredProducts.filter((p) => selectedIds.has(p.id)) : filteredProducts;

  const runBulk = (
    targets: any[],
    fn: (p: any, current: ProductChanges | undefined) => Partial<ProductChanges> | null,
    label: string
  ) => {
    const next = { ...editedRef.current };
    let count = 0;
    for (const p of targets) {
      const patch = fn(p, next[p.id]);
      if (!patch) continue;
      if (applyPatch(next, p, patch)) count++;
    }
    setEditedChanges(next);
    showToast(
      count > 0 ? `${label}: ${plural(count, "producto", "productos")} (pendiente guardar)` : "No hubo nada que cambiar",
      count > 0 ? "success" : "info"
    );
  };

  const requestBulkAction = (action: BulkAction) => {
    const targets = getBulkTargets();
    if (targets.length === 0) {
      showToast("No hay productos a los que aplicar la acción", "info");
      return;
    }
    const alcance =
      selectedIds.size > 0
        ? plural(targets.length, "producto seleccionado", "productos seleccionados")
        : plural(targets.length, "producto filtrado", "productos filtrados");
    const pendiente = (
      <p className="text-xs text-gray-500">Queda como cambio pendiente: puedes revisarlo, deshacerlo o descartarlo antes de guardar.</p>
    );
    const ask = (req: Omit<DialogRequest, "body"> & { body: React.ReactNode }) =>
      setDialog({ ...req, body: <>{req.body}{pendiente}</> });

    switch (action) {
      case "price_up_10":
      case "price_down_10": {
        const pct = action === "price_up_10" ? 10 : -10;
        ask({
          title: `${pct > 0 ? "Subir" : "Bajar"} 10% el precio`,
          body: (
            <p>
              Se {pct > 0 ? "subirá" : "bajará"} un 10% el precio de <b>{alcance}</b> (redondeado al peso).
            </p>
          ),
          confirmText: "Aplicar",
          tone: "danger",
          onConfirm: () =>
            runBulk(
              targets,
              (p, cur) => {
                const price = Number(cur?.price ?? p.price ?? 0);
                return price > 0 ? { price: Math.round(price * (1 + pct / 100)) } : null;
              },
              "Precio ajustado"
            ),
        });
        return;
      }
      case "set_stock":
        ask({
          title: "Fijar stock",
          body: (
            <p>
              Se reemplaza el stock de <b>{alcance}</b> por el mismo número. Al guardar se registra como ajuste de
              inventario.
            </p>
          ),
          confirmText: "Fijar stock",
          tone: "danger",
          input: { label: "Stock para todos", defaultValue: "", integer: true },
          onConfirm: (v) => runBulk(targets, () => ({ stock: v as number }), "Stock fijado"),
        });
        return;
      case "set_cost":
        ask({
          title: "Fijar costo",
          body: (
            <p>
              Se reemplaza el costo de compra de <b>{alcance}</b> por el mismo valor.
            </p>
          ),
          confirmText: "Fijar costo",
          tone: "danger",
          input: { label: "Costo de compra ($)", defaultValue: "" },
          onConfirm: (v) => runBulk(targets, () => ({ purchasePrice: v as number }), "Costo fijado"),
        });
        return;
      case "activate":
      case "deactivate": {
        const active = action === "activate";
        ask({
          title: active ? "Activar en la tienda" : "Ocultar de la tienda",
          body: (
            <p>
              Se {active ? "activarán" : "ocultarán"} <b>{alcance}</b>.
            </p>
          ),
          confirmText: active ? "Activar" : "Ocultar",
          tone: active ? "primary" : "danger",
          onConfirm: () => runBulk(targets, () => ({ isActive: active }), active ? "Activados" : "Ocultos"),
        });
        return;
      }
      case "assign_category": {
        const cat = bulkCategory;
        if (!cat) {
          showToast("Elige una categoría primero", "info");
          return;
        }
        ask({
          title: "Asignar categoría",
          body: (
            <p>
              Se agrega «{cat}» a <b>{alcance}</b> (los que ya la tienen no cambian).
            </p>
          ),
          confirmText: "Asignar",
          onConfirm: () =>
            runBulk(
              targets,
              (p, cur) => {
                const current: string[] = cur?.categories ?? p.categories ?? [];
                if (current.some((c) => c.toLowerCase() === cat.toLowerCase())) return null;
                return { categories: [...current, cat] };
              },
              `Categoría «${cat}» agregada`
            ),
        });
        return;
      }
      case "fill_min_opt":
        ask({
          title: "Completar stock mínimo y óptimo",
          body: (
            <p>
              En <b>{alcance}</b>, donde el mínimo o el óptimo estén vacíos o en 0 se pone 5 y 20.
            </p>
          ),
          confirmText: "Completar",
          onConfirm: () =>
            runBulk(
              targets,
              (p, cur) => {
                const min = cur?.minStock ?? p.minStock;
                const opt = cur?.optimumStock ?? p.optimumStock;
                const patch: Partial<ProductChanges> = {};
                if (!min || min <= 0) patch.minStock = 5;
                if (!opt || opt <= 0) patch.optimumStock = 20;
                return Object.keys(patch).length > 0 ? patch : null;
              },
              "Mín/ópt completado"
            ),
        });
        return;
      case "normalize_categories": {
        // Unifica mayúsculas/duplicados contra la lista oficial
        // (ej. "desayunos" → "Desayunos").
        const canonical = new Map(allCategories.map((c) => [c.trim().toLowerCase(), c.trim()]));
        ask({
          title: "Normalizar categorías",
          body: (
            <p>
              En <b>{alcance}</b> se unifican mayúsculas y se quitan categorías repetidas, usando los nombres de la lista
              oficial.
            </p>
          ),
          confirmText: "Normalizar",
          onConfirm: () =>
            runBulk(
              targets,
              (p, cur) => {
                const current: string[] = cur?.categories ?? p.categories ?? [];
                const seen = new Set<string>();
                const fixed: string[] = [];
                for (const c of current) {
                  const t = c.trim();
                  if (!t) continue;
                  const norm = canonical.get(t.toLowerCase()) ?? t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
                  if (!seen.has(norm.toLowerCase())) {
                    seen.add(norm.toLowerCase());
                    fixed.push(norm);
                  }
                }
                return JSON.stringify(fixed) !== JSON.stringify(current) ? { categories: fixed } : null;
              },
              "Categorías normalizadas"
            ),
        });
        return;
      }
    }
  };

  // ── Duplicados ───────────────────────────────────────────────────
  //
  // Fusionar deja los cambios pendientes, como cualquier otra edición de esta
  // página: nada se escribe hasta que se aprieta Guardar, y el guardado hace
  // backup antes. Así se puede revisar la fusión (y descartarla) antes de que
  // toque la base.

  const dismissDuplicateGroup = useCallback((id: string) => {
    setDismissedDuplicates((prev) => {
      const next = new Set(prev).add(id);
      saveDismissedDuplicates(next);
      return next;
    });
  }, []);

  const mergeDuplicateGroup = useCallback(
    (group: DuplicateGroup) => {
      const plan = buildMergePlan(group, editedRef.current);

      if (Object.keys(plan.changes).length === 0) {
        showToast("Este grupo ya está unificado: no hay nada que corregir", "info");
        dismissDuplicateGroup(group.id);
        return;
      }

      setEditedChanges((prev) => {
        const next = { ...prev };
        for (const [id, cambios] of Object.entries(plan.changes)) {
          next[id] = { ...next[id], ...cambios };
        }
        return next;
      });
      dismissDuplicateGroup(group.id);

      const detalle = [
        plan.rescued.length > 0 ? `se rescató ${plan.rescued.join(", ")}` : null,
        plan.stockSumado ? `stock sumado: ${plan.stockFinal}` : null,
        `${group.others.length} código(s) quedan ocultos en 0`,
      ].filter(Boolean);

      showToast(
        `"${group.keeper.name}" unificado en ${group.keeper.id} — ${detalle.join(" · ")} (pendiente guardar)`,
        "success"
      );
    },
    [showToast, dismissDuplicateGroup]
  );

  const mergeAllDuplicates = (groups: DuplicateGroup[]) => {
    const acumulado: ChangesMap = {};
    let fusionados = 0;

    for (const group of groups) {
      const plan = buildMergePlan(group, { ...editedRef.current, ...acumulado });
      if (Object.keys(plan.changes).length === 0) continue;
      for (const [id, cambios] of Object.entries(plan.changes)) {
        acumulado[id] = { ...acumulado[id], ...cambios };
      }
      fusionados++;
    }

    if (fusionados === 0) {
      showToast("No quedan duplicados por corregir", "info");
      return;
    }

    setEditedChanges((prev) => {
      const next = { ...prev };
      for (const [id, cambios] of Object.entries(acumulado)) {
        next[id] = { ...next[id], ...cambios };
      }
      return next;
    });
    setDismissedDuplicates((prev) => {
      const next = new Set(prev);
      for (const g of groups) next.add(g.id);
      saveDismissedDuplicates(next);
      return next;
    });

    showToast(`${plural(fusionados, "grupo unificado", "grupos unificados")} sobre el código escaneado (pendiente guardar)`, "success");
  };

  const requestMergeAll = (groups: DuplicateGroup[]) => {
    const filas = groups.reduce((n, g) => n + g.others.length, 0);
    setDialog({
      title: "Unificar todos los duplicados",
      body: (
        <>
          <p>
            Se unifican <b>{plural(groups.length, "grupo", "grupos")}</b>: {plural(filas, "fila repetida queda", "filas repetidas quedan")}{" "}
            oculta{filas === 1 ? "" : "s"} y en 0, y sus datos pasan al código que se conserva.
          </p>
          <p className="text-xs text-gray-500">Queda como cambio pendiente: revísalo antes de guardar.</p>
        </>
      ),
      confirmText: "Unificar",
      tone: "danger",
      onConfirm: () => mergeAllDuplicates(groups),
    });
  };

  // ── Guardar ──────────────────────────────────────────────────────

  const performSave = async (fresh: any[] | null) => {
    const start = editedRef.current;
    const ids = Object.keys(start);
    if (ids.length === 0) return;

    setIsSaving(true);
    const freshById = new Map((fresh ?? []).map((p) => [String(p.id), p]));
    const baseOf = (id: string) => freshById.get(id) ?? productsByIdRef.current.get(id);

    // Backup del estado anterior de lo que se va a tocar (no del catálogo
    // entero: así entra holgado en el navegador).
    const antes = ids.map(baseOf).filter(Boolean);
    const guardados = saveBackups(
      addBackup(loadBackups(), createBackup(antes, `Antes de guardar ${plural(ids.length, "producto", "productos")}`))
    );
    if (guardados) setBackups(guardados);
    else showToast("No hay espacio para el backup local en este navegador; se guarda igual.", "warning", 7000);

    // Copia propia: el estado de React no se toca mientras se guarda.
    const toSave: ChangesMap = {};
    for (const id of ids) toSave[id] = { ...start[id] };
    const uploaded = new Map<string, string>();

    try {
      // 1. Fotos nuevas a Cloudinary, de a 4 en paralelo. Si una falla, esa
      //    foto NO viaja (antes se guardaba la imagen entera en base64 en la
      //    base) y queda pendiente para reintentar.
      const imageFailures = new Set<string>();
      const imageIds = ids.filter((id) => toSave[id].image?.startsWith("data:image"));
      await mapWithConcurrency(imageIds, 4, async (id) => {
        try {
          const res = await uploadImageToCloudinaryServerAction(toSave[id].image as string);
          if (!res.ok || !res.url) throw new Error(res.error || "Error al subir imagen");
          toSave[id].image = res.url;
          uploaded.set(id, res.url);
        } catch (err) {
          console.error(`Error subiendo imagen para ${id}:`, err);
          imageFailures.add(id);
          delete toSave[id].image;
        }
      });

      // 2. Cambios de código de barras. El barcode es la clave del negocio
      //    (onConflict:'barcode' en el upsert): un cambio no puede viajar por
      //    el upsert, que crearía una fila nueva y dejaría huérfana la
      //    original. Se resuelve con un UPDATE real (rename-barcode), de a uno
      //    porque un renombre puede depender de otro (A→B, B→C). El resto de
      //    los campos de un producto renombrado se arma a mano, con el código
      //    nuevo, a partir de los datos frescos.
      const plain: ChangesMap = {};
      const renamedPayloads: (Partial<import("@/types").SupaProduct> & { barcode: string })[] = [];
      const renameFailures = new Map<string, string>();
      let renamedCount = 0;

      for (const id of ids) {
        const { barcode: newBarcode, ...rest } = toSave[id];
        if (newBarcode === undefined) {
          if (Object.keys(rest).length > 0) plain[id] = rest;
          continue;
        }
        if (!newBarcode) {
          renameFailures.set(id, "el código no puede quedar vacío");
          if (Object.keys(rest).length > 0) plain[id] = rest;
          continue;
        }

        try {
          await renameProductBarcode(id, newBarcode);
          renamedCount++;
          const original: any = baseOf(id);
          if (original && Object.keys(rest).length > 0) {
            const merged: any = { ...original, ...rest };
            // El stock sólo viaja si esta edición lo tocó: mandar el valor
            // cacheado forzaba un ajuste de inventario a una cifra vieja.
            const stockEdit = rest.stock === undefined ? {} : { stock: Number(rest.stock) };
            renamedPayloads.push({
              barcode: newBarcode,
              ...stockEdit,
              name: merged.name,
              category: Array.isArray(merged.categories) ? merged.categories.join(", ") : "",
              purchase_price: Number(merged.purchasePrice ?? 0),
              sale_price: Number(merged.price ?? 0),
              image_url: merged.image,
              gallery: original.gallery,
              featured: original.featured,
              is_active: merged.isActive,
              measurement_unit: original.measurementUnit,
              measurement_value: original.measurementValue,
              suggested_price: original.suggestedPrice,
              offer_price: merged.offerPrice ?? undefined,
              description: merged.description,
              min_stock: Number(merged.minStock ?? 5),
              optimum_stock: Number(merged.optimumStock ?? 20),
            });
          }
        } catch (err: any) {
          // La fila sigue bajo el código viejo: el resto de los campos se
          // guarda ahí y el cambio de código queda pendiente para reintentar.
          renameFailures.set(id, err?.message || "error desconocido");
          if (Object.keys(rest).length > 0) plain[id] = rest;
        }
      }

      // 3. Guardar. updateProductsBulk arma cada fila sobre los datos frescos
      //    (no sobre la caché de cuando se abrió la página) y recarga el
      //    catálogo al final, así que los renombrados van antes.
      let stockError: string | undefined;
      if (renamedPayloads.length > 0) {
        stockError = (await saveProductsBulk(renamedPayloads)).stockError;
      }
      if (Object.keys(plain).length > 0) {
        const r = await updateProductsBulk(plain as any, fresh ? { base: fresh } : undefined);
        stockError = stockError ?? r?.stockError;
      } else if (renamedCount > 0) {
        await refresh();
      }

      // 4. Queda pendiente lo que falló y lo que se editó mientras se
      //    guardaba; el resto se limpia.
      const stockIds = new Set(stockError ? Object.keys(plain).filter((id) => plain[id].stock !== undefined) : []);
      setEditedChanges((prev) => {
        const next: ChangesMap = {};
        for (const id of Object.keys(prev)) {
          const cur = prev[id];
          const sent: any = start[id] ?? {};
          const keep: ProductChanges = {};
          for (const k of Object.keys(cur) as (keyof ProductChanges)[]) {
            if (JSON.stringify(cur[k]) !== JSON.stringify(sent[k])) (keep as any)[k] = cur[k];
          }
          if (imageFailures.has(id) && cur.image !== undefined) keep.image = cur.image;
          if (renameFailures.has(id) && cur.barcode !== undefined) keep.barcode = cur.barcode;
          if (stockIds.has(id) && cur.stock !== undefined) keep.stock = cur.stock;
          if (Object.keys(keep).length > 0) next[id] = keep;
        }
        return next;
      });

      const problemas: string[] = [];
      if (imageFailures.size > 0) {
        problemas.push(`${plural(imageFailures.size, "foto no se pudo subir", "fotos no se pudieron subir")} (quedan pendientes)`);
      }
      if (renameFailures.size > 0) {
        problemas.push(
          `${plural(renameFailures.size, "código no se pudo renombrar", "códigos no se pudieron renombrar")}: ` +
            [...renameFailures]
              .slice(0, 3)
              .map(([id, m]) => `${id} (${m})`)
              .join("; ")
        );
      }
      if (stockError) problemas.push(`el stock no se actualizó (${stockError}); quedó pendiente`);

      if (problemas.length === 0) {
        showToast(`¡${plural(ids.length, "producto actualizado", "productos actualizados")}!`, "success");
      } else {
        showToast(`Guardado con problemas: ${problemas.join(" · ")}`, "error", 10000);
      }
    } catch (err: any) {
      showToast(`No se pudo guardar: ${err?.message || "error desconocido"}. Tus cambios siguen pendientes.`, "error", 8000);
      // Las fotos que sí subieron no se vuelven a subir al reintentar.
      if (uploaded.size > 0) {
        setEditedChanges((prev) => {
          const next = { ...prev };
          for (const [id, url] of uploaded) {
            if (next[id]?.image === start[id]?.image) next[id] = { ...next[id], image: url };
          }
          return next;
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const requestSave = async () => {
    const changes = editedRef.current;
    const ids = Object.keys(changes);
    if (ids.length === 0) {
      showToast("No hay cambios pendientes", "info");
      return;
    }

    // Se trae el estado actual de la base para avisar si otra persona cambió
    // algo de lo que se va a pisar, y para armar el guardado sobre eso.
    setIsSaving(true);
    let fresh: any[] | null = null;
    try {
      fresh = await fetchAllProducts({ panel: true });
    } catch (err) {
      console.error("No se pudo verificar el estado actual antes de guardar:", err);
    } finally {
      setIsSaving(false);
    }

    const summary = summarizeChanges(changes, localProducts);
    const conflicts = fresh ? findConflicts(changes, localProducts, fresh) : [];
    const risky = summary.warnings.length > 0 || conflicts.length > 0 || summary.renames.length > 0;

    setDialog({
      title: `Guardar ${plural(ids.length, "producto", "productos")}`,
      body: <SaveSummary count={ids.length} summary={summary} conflicts={conflicts} verified={fresh !== null} />,
      confirmText: risky ? "Guardar igual" : "Guardar",
      tone: risky ? "danger" : "primary",
      onConfirm: () => {
        void performSave(fresh);
      },
    });
  };

  // ── Descartar / refrescar ────────────────────────────────────────

  const requestDiscard = () => {
    if (!hasChanges) return;
    setDialog({
      title: "Descartar cambios",
      body: (
        <p>
          Se pierden los cambios pendientes de <b>{plural(changedCount, "producto", "productos")}</b>. No se puede deshacer.
        </p>
      ),
      confirmText: "Descartar",
      tone: "danger",
      onConfirm: () => {
        setEditedChanges({});
        showToast("Cambios descartados", "info");
      },
    });
  };

  // Antes era window.location.reload(): borraba los cambios sin avisar. Ahora
  // recarga sólo el catálogo y los cambios pendientes se mantienen.
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refresh();
      showToast(
        hasChanges
          ? `Catálogo actualizado. Tus cambios pendientes (${changedCount}) se mantienen.`
          : "Catálogo actualizado",
        "info"
      );
    } catch {
      showToast("No se pudo refrescar el catálogo", "error");
    } finally {
      setIsRefreshing(false);
    }
  };

  // ── Importar / exportar ──────────────────────────────────────────

  const handleXlsxImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reset = () => {
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    if (file.size > 10 * 1024 * 1024) {
      showToast("El archivo pesa más de 10 MB", "error");
      reset();
      return;
    }

    setIsImporting(true);
    try {
      const { readSheet } = await import("read-excel-file/browser");
      const rows = (await readSheet(file)) as unknown[][];
      if (rows.length < 2) {
        showToast("El archivo no contiene datos", "error");
        return;
      }

      const plan = buildImportPlan(rows, localProducts);
      if (plan.error) {
        showToast(plan.error, "error");
        return;
      }
      if (plan.matched === 0) {
        showToast(
          "El archivo no trae cambios" +
            (plan.unmatched ? ` · ${plural(plan.unmatched, "código sin coincidencia", "códigos sin coincidencia")}` : "") +
            (plan.invalid.length ? ` · ${plural(plan.invalid.length, "valor no válido", "valores no válidos")}` : ""),
          "info"
        );
        return;
      }

      setDialog({
        title: "Importar XLSX",
        body: <ImportSummary plan={plan} fileName={file.name} />,
        confirmText: `Aplicar a ${plural(plan.matched, "producto", "productos")}`,
        onConfirm: () => {
          setEditedChanges((prev) => {
            const next = { ...prev };
            for (const [id, ch] of Object.entries(plan.changes)) next[id] = { ...next[id], ...ch };
            return next;
          });
          showToast(`XLSX importado: ${plural(plan.matched, "producto", "productos")} con cambios (pendiente guardar)`, "success");
        },
      });
    } catch (err: any) {
      showToast(`No se pudo leer el archivo: ${err?.message || "formato no válido"}. Debe ser .xlsx.`, "error");
    } finally {
      setIsImporting(false);
      reset();
    }
  };

  const handleExport = async () => {
    if (filteredProducts.length === 0) {
      showToast("No hay productos para exportar", "info");
      return;
    }
    setIsExporting(true);
    try {
      const { default: writeXlsxFile } = await import("write-excel-file/browser");
      const data = [
        EXPORT_COLUMNS.map((c) => ({ value: c.header, fontWeight: "bold" as const })),
        ...filteredProducts.map((p) => EXPORT_COLUMNS.map((c) => c.value(p))),
      ];
      await writeXlsxFile(data, {
        columns: EXPORT_COLUMNS.map((c) => ({ width: c.width })),
        stickyRowsCount: 1,
      }).toFile(`edicion-masiva-${new Date().toISOString().slice(0, 10)}.xlsx`);
      showToast(`Exportados ${plural(filteredProducts.length, "producto", "productos")}`, "success");
    } catch (err: any) {
      showToast(`No se pudo exportar: ${err?.message || "error desconocido"}`, "error");
    } finally {
      setIsExporting(false);
    }
  };

  // ── Historial ────────────────────────────────────────────────────

  const requestRestore = (backup: Backup) => {
    const byId = new Map(localProducts.map((p) => [String(p.id), p]));
    const byBarcode = new Map(localProducts.filter((p) => p.barcode).map((p) => [String(p.barcode), p]));
    const newChanges: ChangesMap = {};
    for (const snap of backup.products) {
      const current = byId.get(String(snap.id)) ?? (snap.barcode ? byBarcode.get(String(snap.barcode)) : undefined);
      if (!current) continue;
      const changes = diffSnapshot(snap, current);
      if (Object.keys(changes).length > 0) newChanges[current.id] = changes;
    }

    const n = Object.keys(newChanges).length;
    if (n === 0) {
      showToast("Ese backup coincide con el estado actual: no hay nada que restaurar", "info");
      return;
    }

    setDialog({
      title: "Restaurar backup",
      body: (
        <>
          <p>
            Se cargan como cambios pendientes las diferencias de <b>{plural(n, "producto", "productos")}</b> con «
            {backup.label}» ({new Date(backup.timestamp).toLocaleString("es-CL")}).
          </p>
          {hasChanges && (
            <p className="font-bold text-rose-700">Reemplaza tus {plural(changedCount, "cambio pendiente", "cambios pendientes")} actuales.</p>
          )}
          <p className="text-xs text-gray-500">Nada se guarda hasta apretar Guardar.</p>
        </>
      ),
      confirmText: "Restaurar",
      tone: "danger",
      onConfirm: () => {
        setEditedChanges(newChanges);
        setShowHistory(false);
        showToast(`Restaurado: ${plural(n, "producto", "productos")} con diferencias (pendiente guardar)`, "info");
      },
    });
  };

  const requestDeleteBackup = (backup: Backup) => {
    setDialog({
      title: "Eliminar backup",
      body: <p>Se elimina «{backup.label}» del historial de este navegador.</p>,
      confirmText: "Eliminar",
      tone: "danger",
      onConfirm: () => {
        const updated = backups.filter((b) => b.id !== backup.id);
        const saved = saveBackups(updated);
        if (saved) setBackups(saved);
        else showToast("No se pudo actualizar el historial", "error");
      },
    });
  };

  // ── Render ───────────────────────────────────────────────────────

  // Sólo ADMIN: precios, costos, fotos y códigos los rechaza el servidor para
  // cualquier otro rol, y antes la pantalla igual decía "guardado".
  if (sessionStatus === "authenticated" && rol !== "ADMIN") {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <p className="text-xl font-black text-gray-800 mb-2">Solo administradores</p>
        <p className="text-sm text-gray-600">
          La edición masiva cambia precios, costos y códigos, que sólo puede guardar un administrador.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-4 md:py-6 pb-32">
      <PageHeader
        isSaving={isSaving}
        isImporting={isImporting}
        isExporting={isExporting}
        isRefreshing={isRefreshing}
        showHistory={showHistory}
        setShowHistory={setShowHistory}
        backupsCount={backups.length}
        fileInputRef={fileInputRef}
        onXlsxImport={handleXlsxImport}
        onExport={handleExport}
        onRefresh={handleRefresh}
        onDiscard={requestDiscard}
        onSaveAll={requestSave}
        hasChanges={hasChanges}
        changedCount={changedCount}
      />

      {showHistory && (
        <HistoryPanel
          backups={backups}
          onClose={() => setShowHistory(false)}
          onRestore={requestRestore}
          onDelete={requestDeleteBackup}
        />
      )}

      {showDuplicates && (
        <DuplicatesPanel
          groups={duplicateGroups}
          dismissed={dismissedDuplicates}
          onDismiss={dismissDuplicateGroup}
          onMerge={mergeDuplicateGroup}
          onMergeAll={requestMergeAll}
          onClose={() => setShowDuplicates(false)}
        />
      )}

      <FiltersToolbar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        sortPriority={sortPriority}
        setSortPriority={changeSortPriority}
        completenessTab={completenessTab}
        setCompletenessTab={setCompletenessTab}
        stockFilter={stockFilter}
        setStockFilter={setStockFilter}
        missingFilter={missingFilter}
        setMissingFilter={setMissingFilter}
        filterLowStock={filterLowStock}
        setFilterLowStock={setFilterLowStock}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        allCategories={allCategories}
        viewMode={viewMode}
        changeViewMode={changeViewMode}
        showBulkActions={showBulkActions}
        setShowBulkActions={setShowBulkActions}
        selectedCount={selectedIds.size}
        filteredCount={filteredProducts.length}
        tabCounts={tabCounts}
        missingCounts={missingCounts}
        duplicateGroupCount={pendingDuplicateGroups.length}
        showDuplicates={showDuplicates}
        setShowDuplicates={setShowDuplicates}
        bulkCategory={bulkCategory}
        setBulkCategory={setBulkCategory}
        onBulkAction={requestBulkAction}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearFilters}
      />

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 mb-3 px-1 text-xs text-gray-600">
        <span>
          <b className="text-gray-900">{filteredProducts.length}</b> de {localProducts.length} productos
          {hasActiveFilters ? " con estos filtros" : ""} ·{" "}
          <b className="text-emerald-700">{readyCount}</b> listos para vitrina
        </span>
        {hasChanges && <span className="text-gray-500">Las filas que editas se quedan en la lista hasta guardar.</span>}
      </div>

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
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            allVisibleSelected={allVisibleSelected}
            onToggleAllVisible={toggleAllVisible}
            onRevert={revertProduct}
            onPasteColumn={pasteColumn}
          />
        )}

        <ProductCardsGrid
          viewMode={viewMode}
          visibleProducts={visibleProducts}
          editedChanges={editedChanges}
          onChange={handleInputChange}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onRevert={revertProduct}
          onPasteColumn={pasteColumn}
        />

        {filteredProducts.length > visibleCount && (
          <div className="mt-6 text-center">
            <button
              onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
              className="px-8 h-12 rounded-2xl bg-white border-2 border-gray-200 hover:border-brand-400 font-black text-xs uppercase tracking-wider text-gray-600 hover:text-brand-700 transition-colors shadow-sm"
            >
              Mostrar más ({filteredProducts.length - visibleCount} restantes)
            </button>
          </div>
        )}

        {filteredProducts.length === 0 && (
          <div className="py-20 md:py-28 text-center bg-white rounded-[2rem] border-2 border-dashed border-gray-200">
            <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl">🔍</div>
            {hasActiveFilters ? (
              <>
                <p className="text-lg font-black text-gray-700 mb-1">Ningún producto cumple estos filtros</p>
                <button
                  onClick={clearFilters}
                  className="mt-3 px-5 h-10 rounded-xl bg-gray-900 text-white text-xs font-bold hover:bg-gray-700"
                >
                  Limpiar filtros
                </button>
              </>
            ) : (
              <p className="text-lg font-black text-gray-700">No hay productos cargados</p>
            )}
          </div>
        )}
      </div>

      <MobileSaveBar
        hasChanges={hasChanges}
        changedCount={changedCount}
        isSaving={isSaving}
        onSaveAll={requestSave}
        onDiscard={requestDiscard}
      />

      <div className="hidden md:flex flex-wrap mt-8 justify-center gap-x-6 gap-y-2 text-[11px] font-bold text-gray-500">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-brand-500" /> Cambio pendiente
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Stock bajo (1–5)
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Sin stock o precio a revisar
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-violet-500" /> Backups: {backups.length}/{MAX_BACKUPS}
        </div>
        <div>Enter / ↑ ↓: moverse entre filas · Pegar una columna de Excel la reparte hacia abajo</div>
      </div>

      <ActionDialog request={dialog} onClose={closeDialog} />
    </div>
  );
}
