"use client";

import {
  MagnifyingGlassIcon,
  PlusIcon,
  MinusIcon,
  PercentBadgeIcon,
  CheckCircleIcon,
  Squares2X2Icon,
  TableCellsIcon,
  TagIcon,
  SparklesIcon,
  EyeIcon,
  EyeSlashIcon,
  AdjustmentsHorizontalIcon,
  FunnelIcon,
  ArrowsRightLeftIcon,
  ArchiveBoxIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { type SortPriority, type CompletenessTab, type StockFilter, type MissingFilter } from "../lib";

export type BulkAction =
  | "activate"
  | "deactivate"
  | "price_up_10"
  | "price_down_10"
  | "set_stock"
  | "set_cost"
  | "assign_category"
  | "fill_min_opt"
  | "normalize_categories";

interface FiltersToolbarProps {
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  sortPriority: SortPriority;
  setSortPriority: (v: SortPriority) => void;
  completenessTab: CompletenessTab;
  setCompletenessTab: (v: CompletenessTab) => void;
  stockFilter: StockFilter;
  setStockFilter: (v: StockFilter) => void;
  missingFilter: MissingFilter;
  setMissingFilter: (v: MissingFilter) => void;
  filterLowStock: boolean;
  setFilterLowStock: (v: boolean) => void;
  categoryFilter: string;
  setCategoryFilter: (v: string) => void;
  allCategories: string[];
  viewMode: "table" | "cards";
  changeViewMode: (v: "table" | "cards") => void;
  showBulkActions: boolean;
  setShowBulkActions: (v: boolean) => void;
  selectedCount: number;
  filteredCount: number;
  tabCounts: {
    all: number;
    missing_1: number;
    missing_2: number;
    missing_3_plus: number;
    complete: number;
  };
  missingCounts: {
    with_stock: number;
    counted: number;
    counted_today: number;
    uncounted: number;
    duplicates: number;
    missing_photo: number;
    missing_price: number;
    missing_stock: number;
    missing_cost: number;
    missing_category: number;
    missing_barcode: number;
    inactive: number;
    low_stock: number;
  };
  duplicateGroupCount: number;
  showDuplicates: boolean;
  setShowDuplicates: (v: boolean) => void;
  bulkCategory: string;
  setBulkCategory: (v: string) => void;
  onBulkAction: (action: BulkAction) => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}

type Tone = "neutral" | "danger" | "warning" | "success" | "info";

// Un solo código de color para todos los chips: rojo = falta algo que impide
// publicar, ámbar = conviene revisarlo, verde = está bien, azul = información
// del conteo. Antes cada chip tenía su propio color (once en total) y el rojo
// significaba cosas distintas en filas distintas.
const DOT: Record<Tone, string> = {
  neutral: "bg-gray-400",
  danger: "bg-rose-500",
  warning: "bg-amber-500",
  success: "bg-emerald-500",
  info: "bg-sky-500",
};
const ACTIVE: Record<Tone, string> = {
  neutral: "bg-gray-900 text-white border-gray-900",
  danger: "bg-rose-600 text-white border-rose-600",
  warning: "bg-amber-500 text-white border-amber-500",
  success: "bg-emerald-600 text-white border-emerald-600",
  info: "bg-sky-600 text-white border-sky-600",
};

function Chip({
  active,
  tone,
  count,
  onClick,
  title,
  badge,
  children,
}: {
  active: boolean;
  tone: Tone;
  count?: number;
  onClick: () => void;
  title?: string;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={`h-8 px-2.5 rounded-xl text-xs font-bold transition-colors shrink-0 flex items-center gap-1.5 border ${
        active ? ACTIVE[tone] : "bg-white text-gray-700 border-gray-200 hover:border-gray-400"
      }`}
    >
      {!active && <span className={`w-1.5 h-1.5 rounded-full ${DOT[tone]}`} aria-hidden="true" />}
      <span>{children}</span>
      {count !== undefined && (
        <span className={`tabular-nums ${active ? "text-white/90" : "text-gray-500"}`}>{count}</span>
      )}
      {badge && (
        <span
          className={`text-[10px] px-1 rounded font-black uppercase ${
            active ? "bg-white/25" : "bg-gray-100 text-gray-600"
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

function RowLabel({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-black uppercase tracking-wider text-gray-500 shrink-0 mr-1 flex items-center gap-1 sm:w-28">
      {icon}
      {children}
    </span>
  );
}

export default function FiltersToolbar({
  searchTerm,
  setSearchTerm,
  sortPriority,
  setSortPriority,
  completenessTab,
  setCompletenessTab,
  stockFilter,
  setStockFilter,
  missingFilter,
  setMissingFilter,
  filterLowStock,
  setFilterLowStock,
  categoryFilter,
  setCategoryFilter,
  allCategories,
  viewMode,
  changeViewMode,
  showBulkActions,
  setShowBulkActions,
  selectedCount,
  filteredCount,
  tabCounts,
  missingCounts,
  duplicateGroupCount,
  showDuplicates,
  setShowDuplicates,
  bulkCategory,
  setBulkCategory,
  onBulkAction,
  hasActiveFilters,
  onClearFilters,
}: FiltersToolbarProps) {
  const tab = (v: CompletenessTab) => setCompletenessTab(completenessTab === v ? "all" : v);
  const stock = (v: StockFilter) => setStockFilter(stockFilter === v ? "all" : v);
  const missing = (v: MissingFilter) => setMissingFilter(missingFilter === v ? "all" : v);

  return (
    <>
      {/* ── Barra fija: búsqueda, orden, categoría, vista y acciones ──
          Sólo esta fila queda pegada arriba al bajar (y sólo en escritorio):
          antes se pegaban también las tres filas de chips y tapaban un tercio
          de la pantalla. */}
      <div className="lg:sticky lg:top-2 z-30 bg-white/95 backdrop-blur rounded-2xl p-2.5 shadow-lg shadow-gray-200/50 border border-gray-100 mb-3 space-y-2.5">
        <div className="flex flex-col lg:flex-row gap-2">
          <div className="relative flex-1 min-w-0">
            <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="search"
              placeholder="Buscar por nombre o código..."
              aria-label="Buscar productos"
              className="w-full pl-10 pr-4 h-11 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-brand-500 font-medium text-sm text-gray-900"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5 bg-gray-50 rounded-xl px-3 h-11 min-w-0">
              <AdjustmentsHorizontalIcon className="w-4 h-4 text-gray-500 shrink-0" />
              <span className="text-[11px] font-black uppercase tracking-wider text-gray-500 hidden sm:inline">Orden</span>
              <select
                value={sortPriority}
                onChange={(e) => setSortPriority(e.target.value as SortPriority)}
                className="bg-transparent text-xs font-bold text-gray-900 focus:outline-none cursor-pointer pr-1 max-w-[13rem] truncate"
              >
                <option value="stock_real">Stock real (contado) primero</option>
                <option value="near_ready">Casi listos primero</option>
                <option value="most_incomplete">Más incompletos primero</option>
                <option value="ready_first">Listos primero</option>
                <option value="name_asc">Nombre A–Z</option>
                <option value="name_desc">Nombre Z–A</option>
                <option value="stock_desc">Mayor stock primero</option>
                <option value="stock_asc">Menor stock primero</option>
                <option value="price_asc">Menor precio primero</option>
                <option value="price_desc">Mayor precio primero</option>
              </select>
            </label>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              aria-label="Filtrar por categoría"
              className={`h-11 px-3 rounded-xl font-bold text-xs border-2 transition-colors focus:outline-none cursor-pointer max-w-[12rem] ${
                categoryFilter ? "bg-brand-50 text-brand-700 border-brand-300" : "bg-gray-50 text-gray-700 border-transparent"
              }`}
            >
              <option value="">Todas las categorías</option>
              {allCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <div className="flex rounded-xl border-2 border-gray-100 overflow-hidden shrink-0 bg-gray-50" role="group" aria-label="Vista">
              <button
                onClick={() => changeViewMode("table")}
                title="Vista tabla"
                aria-label="Vista tabla"
                aria-pressed={viewMode === "table"}
                className={`px-3 h-10 transition-colors flex items-center justify-center ${
                  viewMode === "table" ? "bg-brand-600 text-white" : "text-gray-500 hover:text-gray-800"
                }`}
              >
                <TableCellsIcon className="w-5 h-5" />
              </button>
              <button
                onClick={() => changeViewMode("cards")}
                title="Vista tarjetas"
                aria-label="Vista tarjetas"
                aria-pressed={viewMode === "cards"}
                className={`px-3 h-10 transition-colors flex items-center justify-center ${
                  viewMode === "cards" ? "bg-brand-600 text-white" : "text-gray-500 hover:text-gray-800"
                }`}
              >
                <Squares2X2Icon className="w-5 h-5" />
              </button>
            </div>

            <button
              onClick={() => setShowBulkActions(!showBulkActions)}
              aria-expanded={showBulkActions}
              className={`flex items-center gap-1.5 px-3.5 h-11 rounded-xl font-black text-xs transition-colors border-2 ${
                showBulkActions
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"
              }`}
            >
              <PercentBadgeIcon className="w-4 h-4 shrink-0" />
              <span>Acciones{selectedCount > 0 ? ` (${selectedCount})` : ""}</span>
            </button>

            {duplicateGroupCount > 0 && (
              <button
                onClick={() => setShowDuplicates(!showDuplicates)}
                aria-expanded={showDuplicates}
                title="El mismo producto cargado dos veces con códigos distintos"
                className={`flex items-center gap-1.5 px-3.5 h-11 rounded-xl font-black text-xs transition-colors border-2 ${
                  showDuplicates
                    ? "bg-amber-500 text-white border-amber-500"
                    : "bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100"
                }`}
              >
                <ArrowsRightLeftIcon className="w-4 h-4 shrink-0" />
                <span>Revisar duplicados ({duplicateGroupCount})</span>
              </button>
            )}
          </div>
        </div>

        {/* ── Acciones masivas ── */}
        {showBulkActions && (
          <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 space-y-2.5">
            <p className="text-xs font-bold text-indigo-800">
              {selectedCount > 0
                ? `Se aplican a los ${selectedCount} productos seleccionados.`
                : `Se aplican a los ${filteredCount} productos filtrados. Selecciona filas para limitarlas.`}{" "}
              <span className="font-medium text-indigo-600">Siempre se confirma antes, y nada se guarda hasta apretar Guardar.</span>
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
              <BulkButton onClick={() => onBulkAction("activate")} icon={<EyeIcon className="w-4 h-4" />} label="Activar / Publicar" />
              <BulkButton onClick={() => onBulkAction("deactivate")} icon={<EyeSlashIcon className="w-4 h-4" />} label="Pausar / Ocultar" />
              <BulkButton onClick={() => onBulkAction("price_up_10")} icon={<PlusIcon className="w-4 h-4" />} label="+10% precio" />
              <BulkButton onClick={() => onBulkAction("price_down_10")} icon={<MinusIcon className="w-4 h-4" />} label="−10% precio" />
              <BulkButton onClick={() => onBulkAction("set_stock")} icon={<CheckCircleIcon className="w-4 h-4" />} label="Fijar stock" />
              <BulkButton onClick={() => onBulkAction("set_cost")} icon={<TagIcon className="w-4 h-4" />} label="Fijar costo" />
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex flex-1 gap-2">
                <select
                  value={bulkCategory}
                  onChange={(e) => setBulkCategory(e.target.value)}
                  aria-label="Categoría para asignar"
                  className="flex-1 min-w-0 h-10 px-3 rounded-xl border border-indigo-200 bg-white text-xs font-bold text-indigo-900 focus:outline-none focus:border-indigo-400"
                >
                  <option value="">Elegir categoría para asignar...</option>
                  {allCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => onBulkAction("assign_category")}
                  disabled={!bulkCategory}
                  className="flex items-center gap-1 px-4 h-10 rounded-xl bg-indigo-600 text-white text-xs font-black hover:bg-indigo-700 transition-colors disabled:opacity-40"
                >
                  <TagIcon className="w-3.5 h-3.5" />
                  Asignar
                </button>
              </div>
              <button
                onClick={() => onBulkAction("fill_min_opt")}
                title="Pone stock mínimo 5 y óptimo 20 donde estén vacíos o en cero"
                className="flex items-center justify-center gap-1.5 px-3.5 h-10 rounded-xl bg-white border border-indigo-100 hover:border-indigo-300 text-xs font-bold text-indigo-900 transition-colors"
              >
                <SparklesIcon className="w-3.5 h-3.5 text-indigo-600" />
                Completar mín/ópt (5/20)
              </button>
              <button
                onClick={() => onBulkAction("normalize_categories")}
                title="Unifica mayúsculas y duplicados de categorías"
                className="flex items-center justify-center gap-1.5 px-3.5 h-10 rounded-xl bg-white border border-indigo-100 hover:border-indigo-300 text-xs font-bold text-indigo-900 transition-colors"
              >
                <SparklesIcon className="w-3.5 h-3.5 text-indigo-600" />
                Normalizar categorías
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Filtros (no fijos). Cada fila filtra por su cuenta y se combinan. ── */}
      <div className="bg-white rounded-2xl px-3 py-2.5 shadow-sm border border-gray-100 mb-3 space-y-2">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <RowLabel icon={<FunnelIcon className="w-3.5 h-3.5" />}>Datos</RowLabel>
          <Chip active={completenessTab === "all"} tone="neutral" count={tabCounts.all} onClick={() => setCompletenessTab("all")}>
            Todos
          </Chip>
          <Chip
            active={completenessTab === "missing_1"}
            tone="warning"
            count={tabCounts.missing_1}
            badge="Prioritario"
            title="Les falta un solo dato de la ficha (foto, precio, categoría o SKU)"
            onClick={() => tab("missing_1")}
          >
            Falta 1 dato
          </Chip>
          <Chip active={completenessTab === "missing_2"} tone="warning" count={tabCounts.missing_2} onClick={() => tab("missing_2")}>
            Faltan 2
          </Chip>
          <Chip active={completenessTab === "missing_3_plus"} tone="danger" count={tabCounts.missing_3_plus} onClick={() => tab("missing_3_plus")}>
            Faltan 3+
          </Chip>
          <Chip
            active={completenessTab === "complete"}
            tone="success"
            count={tabCounts.complete}
            title="Foto, precio, categoría y SKU completos. Combínalo con «Con stock» para ver lo listo para vitrina."
            onClick={() => tab("complete")}
          >
            Datos completos
          </Chip>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <RowLabel icon={<ArchiveBoxIcon className="w-3.5 h-3.5" />}>Stock real</RowLabel>
          <Chip
            active={stockFilter === "with_stock"}
            tone="success"
            count={missingCounts.with_stock}
            badge="Publicar ya"
            title="Stock mayor a 0: lo que hay de verdad en la tienda"
            onClick={() => stock("with_stock")}
          >
            Con stock
          </Chip>
          <Chip
            active={stockFilter === "counted_today"}
            tone="info"
            count={missingCounts.counted_today}
            title="Escaneados en un conteo físico en las últimas 48 horas"
            onClick={() => stock("counted_today")}
          >
            Contados (48 h)
          </Chip>
          <Chip
            active={stockFilter === "counted"}
            tone="info"
            count={missingCounts.counted}
            title="Ya pasaron por algún conteo físico"
            onClick={() => stock("counted")}
          >
            Inventario confirmado
          </Chip>
          <Chip
            active={stockFilter === "uncounted"}
            tone="neutral"
            count={missingCounts.uncounted}
            title="Nunca pasaron por un conteo: su stock no está confirmado"
            onClick={() => stock("uncounted")}
          >
            Sin confirmar
          </Chip>
          {missingCounts.duplicates > 0 && (
            <Chip
              active={stockFilter === "duplicates"}
              tone="warning"
              count={missingCounts.duplicates}
              title="Filas que parecen ser el mismo producto con dos códigos (cada grupo tiene 2 o más filas)"
              onClick={() => stock("duplicates")}
            >
              Filas duplicadas
            </Chip>
          )}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <RowLabel icon={<FunnelIcon className="w-3.5 h-3.5" />}>Falta</RowLabel>
          <Chip active={missingFilter === "missing_photo"} tone="danger" count={missingCounts.missing_photo} onClick={() => missing("missing_photo")}>
            Foto
          </Chip>
          <Chip active={missingFilter === "missing_price"} tone="danger" count={missingCounts.missing_price} onClick={() => missing("missing_price")}>
            Precio
          </Chip>
          {missingCounts.missing_category > 0 && (
            <Chip active={missingFilter === "missing_category"} tone="danger" count={missingCounts.missing_category} onClick={() => missing("missing_category")}>
              Categoría
            </Chip>
          )}
          {missingCounts.missing_barcode > 0 && (
            <Chip active={missingFilter === "missing_barcode"} tone="danger" count={missingCounts.missing_barcode} onClick={() => missing("missing_barcode")}>
              SKU
            </Chip>
          )}
          <Chip active={missingFilter === "missing_stock"} tone="danger" count={missingCounts.missing_stock} onClick={() => missing("missing_stock")}>
            Stock (en 0)
          </Chip>
          <Chip active={missingFilter === "missing_cost"} tone="warning" count={missingCounts.missing_cost} onClick={() => missing("missing_cost")}>
            Costo
          </Chip>
          <Chip active={missingFilter === "inactive"} tone="neutral" count={missingCounts.inactive} onClick={() => missing("inactive")}>
            Inactivos
          </Chip>
          <Chip
            active={filterLowStock}
            tone="warning"
            count={missingCounts.low_stock}
            title="Stock entre 0 y 5"
            onClick={() => setFilterLowStock(!filterLowStock)}
          >
            Stock bajo (≤5)
          </Chip>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              className="h-8 px-2.5 rounded-xl text-xs font-bold text-gray-600 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0 flex items-center gap-1"
            >
              <XMarkIcon className="w-3.5 h-3.5" />
              Limpiar filtros
            </button>
          )}
        </div>
      </div>
    </>
  );
}

function BulkButton({ onClick, icon, label }: { onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-1 p-2.5 bg-white rounded-xl border border-indigo-100 hover:border-indigo-400 transition-colors text-indigo-700"
    >
      {icon}
      <span className="text-[11px] font-black text-indigo-900">{label}</span>
    </button>
  );
}
