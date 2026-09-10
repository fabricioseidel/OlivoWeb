"use client";

import {
  MagnifyingGlassIcon,
  ArrowPathIcon,
  ExclamationCircleIcon,
  PlusIcon,
  MinusIcon,
  PercentBadgeIcon,
  CheckCircleIcon,
  ArrowUpTrayIcon,
  ClockIcon,
  PhotoIcon,
  CheckBadgeIcon,
  Squares2X2Icon,
  TableCellsIcon,
  TagIcon,
  SparklesIcon,
  EyeIcon,
  EyeSlashIcon,
  AdjustmentsHorizontalIcon,
  FunnelIcon,
} from "@heroicons/react/24/outline";
import { type SortPriority, type CompletenessTab, type SpecificFilter } from "../lib";

interface FiltersToolbarProps {
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  sortPriority: SortPriority;
  setSortPriority: (v: SortPriority) => void;
  completenessTab: CompletenessTab;
  setCompletenessTab: (v: CompletenessTab) => void;
  specificFilter: SpecificFilter;
  setSpecificFilter: (v: SpecificFilter) => void;
  filterLowStock: boolean;
  setFilterLowStock: (v: boolean) => void;
  filterWithImage: boolean;
  setFilterWithImage: (v: boolean) => void;
  categoryFilter: string;
  setCategoryFilter: (v: string) => void;
  allCategories: string[];
  viewMode: "table" | "cards";
  changeViewMode: (v: "table" | "cards") => void;
  showBulkActions: boolean;
  setShowBulkActions: (v: boolean) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  isImporting: boolean;
  showHistory: boolean;
  setShowHistory: (v: boolean) => void;
  backupsCount: number;
  selectedCount: number;
  filteredCount: number;
  tabCounts: {
    all: number;
    missing_1: number;
    missing_2: number;
    missing_3_plus: number;
    ready: number;
  };
  missingCounts: {
    missing_photo: number;
    missing_price: number;
    missing_stock: number;
    missing_cost: number;
    missing_category: number;
    missing_barcode: number;
    inactive: number;
  };
  applyBulkAdjustment: (type: "price_percent" | "price_fixed" | "stock_fixed" | "cost_fixed", value: number) => void;
  bulkCategory: string;
  setBulkCategory: (v: string) => void;
  assignCategoryToTargets: (cat: string) => void;
  toggleActiveTargetsBulk: (active: boolean) => void;
  fillMissingStockDefaults: () => void;
  normalizeCategoriesBulk: () => void;
}

export default function FiltersToolbar({
  searchTerm,
  setSearchTerm,
  sortPriority,
  setSortPriority,
  completenessTab,
  setCompletenessTab,
  specificFilter,
  setSpecificFilter,
  filterLowStock,
  setFilterLowStock,
  filterWithImage,
  setFilterWithImage,
  categoryFilter,
  setCategoryFilter,
  allCategories,
  viewMode,
  changeViewMode,
  showBulkActions,
  setShowBulkActions,
  fileInputRef,
  isImporting,
  showHistory,
  setShowHistory,
  backupsCount,
  selectedCount,
  filteredCount,
  tabCounts,
  missingCounts,
  applyBulkAdjustment,
  bulkCategory,
  setBulkCategory,
  assignCategoryToTargets,
  toggleActiveTargetsBulk,
  fillMissingStockDefaults,
  normalizeCategoriesBulk,
}: FiltersToolbarProps) {
  return (
    <div className="bg-white rounded-[2rem] p-3 md:p-4 shadow-xl shadow-gray-200/50 border border-gray-100 mb-5 sticky top-4 z-30 space-y-3">
      {/* ── Fila 1: Búsqueda, Orden de Prioridad, Categoría y Vista ── */}
      <div className="flex flex-col lg:flex-row gap-3">
        {/* Barra de búsqueda */}
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por Nombre, SKU o Código..."
            className="w-full pl-11 pr-4 h-11 bg-gray-50 border-0 rounded-2xl focus:ring-2 focus:ring-brand-500 font-medium text-sm text-gray-900 shadow-inner"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Selector de Orden por Prioridad */}
          <div className="flex items-center gap-1.5 bg-brand-50/70 border border-brand-200/80 rounded-2xl px-3 h-11">
            <AdjustmentsHorizontalIcon className="w-4 h-4 text-brand-600 shrink-0" />
            <span className="text-[10px] font-black uppercase tracking-wider text-brand-800 hidden sm:inline">
              Orden:
            </span>
            <select
              value={sortPriority}
              onChange={(e) => setSortPriority(e.target.value as SortPriority)}
              className="bg-transparent text-xs font-black text-brand-900 focus:outline-none cursor-pointer pr-2"
            >
              <option value="near_ready">🎯 Prioridad: Casi listos primero</option>
              <option value="most_incomplete">⚠️ Más incompletos primero</option>
              <option value="ready_first">✅ Listos / Publicados primero</option>
              <option value="name_asc">🔤 Nombre (A - Z)</option>
              <option value="stock_asc">📉 Menor stock primero</option>
              <option value="price_asc">💲 Menor precio primero</option>
              <option value="price_desc">💲 Mayor precio primero</option>
            </select>
          </div>

          {/* Selector de Categoría */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className={`h-11 px-3 rounded-2xl font-bold text-xs border-2 transition-all focus:outline-none cursor-pointer ${
              categoryFilter
                ? "bg-brand-50 text-brand-700 border-brand-200"
                : "bg-gray-50 text-gray-500 border-transparent hover:bg-gray-100"
            }`}
          >
            <option value="">Todas las categorías</option>
            {allCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Alternador de vista (Tabla / Tarjetas) */}
          <div className="flex rounded-2xl border-2 border-gray-100 overflow-hidden shrink-0 bg-gray-50">
            <button
              onClick={() => changeViewMode("table")}
              title="Vista tabla detallada"
              className={`px-3 h-11 transition-colors flex items-center justify-center ${
                viewMode === "table" ? "bg-brand-600 text-white" : "text-gray-400 hover:text-gray-700"
              }`}
            >
              <TableCellsIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => changeViewMode("cards")}
              title="Vista tarjetas"
              className={`px-3 h-11 transition-colors flex items-center justify-center ${
                viewMode === "cards" ? "bg-brand-600 text-white" : "text-gray-400 hover:text-gray-700"
              }`}
            >
              <Squares2X2Icon className="w-5 h-5" />
            </button>
          </div>

          {/* Botón de Acciones Masivas */}
          <button
            onClick={() => setShowBulkActions(!showBulkActions)}
            className={`flex items-center gap-1.5 px-3.5 h-11 rounded-2xl font-black text-xs transition-all border-2 ${
              showBulkActions
                ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20"
                : "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"
            }`}
          >
            <PercentBadgeIcon className="w-4 h-4 shrink-0" />
            <span>Acciones</span>
          </button>
        </div>
      </div>

      {/* ── Fila 2: Pestañas de Completitud (Nivel de preparación) ── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar border-t border-gray-100 pt-2.5">
        <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 shrink-0 mr-1 flex items-center gap-1">
          <FunnelIcon className="w-3.5 h-3.5" /> Estado:
        </span>

        <button
          type="button"
          onClick={() => setCompletenessTab("all")}
          className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 ${
            completenessTab === "all"
              ? "bg-gray-900 text-white shadow-sm"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Todos ({tabCounts.all})
        </button>

        <button
          type="button"
          onClick={() => setCompletenessTab(completenessTab === "missing_1" ? "all" : "missing_1")}
          title="Productos a los que solo les falta 1 dato para salir a la venta"
          className={`px-3 py-1.5 rounded-xl font-black transition-all shrink-0 flex items-center gap-1.5 border ${
            completenessTab === "missing_1"
              ? "bg-amber-500 text-white border-amber-600 shadow-sm"
              : "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
          }`}
        >
          <span>🎯 Falta 1 dato ({tabCounts.missing_1})</span>
          <span className="text-[9px] bg-white/30 px-1 py-0.2 rounded font-black uppercase">¡Prioritario!</span>
        </button>

        <button
          type="button"
          onClick={() => setCompletenessTab(completenessTab === "missing_2" ? "all" : "missing_2")}
          className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 border ${
            completenessTab === "missing_2"
              ? "bg-orange-500 text-white border-orange-600 shadow-sm"
              : "bg-orange-50 text-orange-800 border-orange-200 hover:bg-orange-100"
          }`}
        >
          ⚠️ Faltan 2 datos ({tabCounts.missing_2})
        </button>

        <button
          type="button"
          onClick={() => setCompletenessTab(completenessTab === "missing_3_plus" ? "all" : "missing_3_plus")}
          className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 border ${
            completenessTab === "missing_3_plus"
              ? "bg-rose-600 text-white border-rose-700 shadow-sm"
              : "bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100"
          }`}
        >
          ⚠️ Faltan 3+ ({tabCounts.missing_3_plus})
        </button>

        <button
          type="button"
          onClick={() => setCompletenessTab(completenessTab === "ready" ? "all" : "ready")}
          className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 border ${
            completenessTab === "ready"
              ? "bg-emerald-600 text-white border-emerald-700 shadow-sm"
              : "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
          }`}
        >
          <CheckBadgeIcon className="w-3.5 h-3.5 inline mr-1" />
          Listos ({tabCounts.ready})
        </button>
      </div>

      {/* ── Fila 3: Filtros Específicos por Faltante ── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
        <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 shrink-0 mr-1">
          Faltante específico:
        </span>

        {/* Falta Foto */}
        <button
          type="button"
          onClick={() => setSpecificFilter(specificFilter === "missing_photo" ? "all" : "missing_photo")}
          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 border ${
            specificFilter === "missing_photo"
              ? "bg-rose-500 text-white border-rose-600"
              : "bg-rose-50/70 text-rose-700 border-rose-200 hover:bg-rose-100"
          }`}
        >
          📷 Falta Foto ({missingCounts.missing_photo})
        </button>

        {/* Falta Precio */}
        <button
          type="button"
          onClick={() => setSpecificFilter(specificFilter === "missing_price" ? "all" : "missing_price")}
          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 border ${
            specificFilter === "missing_price"
              ? "bg-amber-500 text-white border-amber-600"
              : "bg-amber-50/70 text-amber-800 border-amber-200 hover:bg-amber-100"
          }`}
        >
          🏷️ Falta Precio ({missingCounts.missing_price})
        </button>

        {/* Sin Stock */}
        <button
          type="button"
          onClick={() => setSpecificFilter(specificFilter === "missing_stock" ? "all" : "missing_stock")}
          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 border ${
            specificFilter === "missing_stock"
              ? "bg-red-600 text-white border-red-700"
              : "bg-red-50/70 text-red-700 border-red-200 hover:bg-red-100"
          }`}
        >
          📦 Sin Stock ({missingCounts.missing_stock})
        </button>

        {/* Falta Costo */}
        <button
          type="button"
          onClick={() => setSpecificFilter(specificFilter === "missing_cost" ? "all" : "missing_cost")}
          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 border ${
            specificFilter === "missing_cost"
              ? "bg-indigo-600 text-white border-indigo-700"
              : "bg-indigo-50/70 text-indigo-700 border-indigo-200 hover:bg-indigo-100"
          }`}
        >
          💲 Falta Costo ({missingCounts.missing_cost})
        </button>

        {/* Falta Categoría */}
        {missingCounts.missing_category > 0 && (
          <button
            type="button"
            onClick={() => setSpecificFilter(specificFilter === "missing_category" ? "all" : "missing_category")}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 border ${
              specificFilter === "missing_category"
                ? "bg-purple-600 text-white border-purple-700"
                : "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
            }`}
          >
            📁 Falta Categoría ({missingCounts.missing_category})
          </button>
        )}

        {/* Falta SKU */}
        {missingCounts.missing_barcode > 0 && (
          <button
            type="button"
            onClick={() => setSpecificFilter(specificFilter === "missing_barcode" ? "all" : "missing_barcode")}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 border ${
              specificFilter === "missing_barcode"
                ? "bg-violet-600 text-white border-violet-700"
                : "bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100"
            }`}
          >
            🔢 Falta SKU ({missingCounts.missing_barcode})
          </button>
        )}

        {/* Inactivos */}
        <button
          type="button"
          onClick={() => setSpecificFilter(specificFilter === "inactive" ? "all" : "inactive")}
          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 border ${
            specificFilter === "inactive"
              ? "bg-gray-700 text-white border-gray-800"
              : "bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200"
          }`}
        >
          👁️ Inactivos ({missingCounts.inactive})
        </button>

        {/* Stock Bajo <= 5 */}
        <button
          type="button"
          onClick={() => setFilterLowStock(!filterLowStock)}
          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 border ${
            filterLowStock
              ? "bg-amber-600 text-white border-amber-700"
              : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"
          }`}
        >
          ⚠️ Stock Bajo (≤5)
        </button>

        {/* Limpiar filtros si hay alguno activo */}
        {(specificFilter !== "all" || filterLowStock || categoryFilter || searchTerm || completenessTab !== "all") && (
          <button
            type="button"
            onClick={() => {
              setSpecificFilter("all");
              setCompletenessTab("all");
              setFilterLowStock(false);
              setCategoryFilter("");
              setSearchTerm("");
            }}
            className="px-2 py-1 rounded-lg text-[10px] font-black uppercase text-gray-400 hover:text-red-500 transition-colors shrink-0"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* ── Panel Desplegable de Acciones Masivas ── */}
      {showBulkActions && (
        <div className="p-4 bg-indigo-50/60 rounded-2xl border border-indigo-100 animate-in slide-in-from-top-2 duration-300 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500">
              {selectedCount > 0
                ? `Acciones para los ${selectedCount} productos seleccionados`
                : `Acciones para los ${filteredCount} productos filtrados`}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            {/* Activar / Publicar seleccionados */}
            <button
              onClick={() => toggleActiveTargetsBulk(true)}
              className="flex flex-col items-center justify-center p-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors shadow-sm"
              title="Activa y publica en vitrina los productos objetivo"
            >
              <EyeIcon className="w-4 h-4 mb-1" />
              <span className="text-[10px] font-black uppercase tracking-wider">Activar / Publicar</span>
            </button>

            {/* Pausar seleccionados */}
            <button
              onClick={() => toggleActiveTargetsBulk(false)}
              className="flex flex-col items-center justify-center p-2.5 bg-white text-gray-700 rounded-xl border border-gray-200 hover:border-gray-400 transition-colors shadow-sm"
              title="Oculta de la vitrina los productos objetivo"
            >
              <EyeSlashIcon className="w-4 h-4 mb-1 text-gray-500" />
              <span className="text-[10px] font-black uppercase tracking-wider">Pausar / Ocultar</span>
            </button>

            {/* +10% Precio */}
            <button
              onClick={() => applyBulkAdjustment("price_percent", 10)}
              className="flex flex-col items-center justify-center p-2.5 bg-white rounded-xl border border-indigo-100 hover:border-indigo-400 transition-colors shadow-sm"
            >
              <PlusIcon className="w-4 h-4 text-indigo-600 mb-1" />
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-900">+10% Precio</span>
            </button>

            {/* -10% Precio */}
            <button
              onClick={() => applyBulkAdjustment("price_percent", -10)}
              className="flex flex-col items-center justify-center p-2.5 bg-white rounded-xl border border-indigo-100 hover:border-indigo-400 transition-colors shadow-sm"
            >
              <MinusIcon className="w-4 h-4 text-indigo-600 mb-1" />
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-900">-10% Precio</span>
            </button>

            {/* Fijar Stock */}
            <button
              onClick={() => {
                const stockStr = prompt("¿Qué stock deseas asignar a los productos objetivo?", "10");
                if (stockStr && !isNaN(parseInt(stockStr))) applyBulkAdjustment("stock_fixed", parseInt(stockStr));
              }}
              className="flex flex-col items-center justify-center p-2.5 bg-white rounded-xl border border-indigo-100 hover:border-indigo-400 transition-colors shadow-sm"
            >
              <CheckCircleIcon className="w-4 h-4 text-indigo-600 mb-1" />
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-900">Fijar Stock</span>
            </button>

            {/* Fijar Costo */}
            <button
              onClick={() => {
                const costStr = prompt("¿Qué costo de compra deseas asignar a los productos objetivo?", "1000");
                if (costStr && !isNaN(parseFloat(costStr))) applyBulkAdjustment("cost_fixed", parseFloat(costStr));
              }}
              className="flex flex-col items-center justify-center p-2.5 bg-white rounded-xl border border-indigo-100 hover:border-indigo-400 transition-colors shadow-sm"
            >
              <TagIcon className="w-4 h-4 text-indigo-600 mb-1" />
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-900">Fijar Costo</span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <div className="flex flex-1 gap-2">
              <select
                value={bulkCategory}
                onChange={(e) => setBulkCategory(e.target.value)}
                className="flex-1 h-10 px-3 rounded-xl border border-indigo-200 bg-white text-xs font-bold text-indigo-900 focus:outline-none focus:border-indigo-400"
              >
                <option value="">Elegir categoría para asignar...</option>
                {allCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <button
                onClick={() => assignCategoryToTargets(bulkCategory)}
                className="flex items-center gap-1 px-4 h-10 rounded-xl bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-colors"
              >
                <TagIcon className="w-3.5 h-3.5" />
                Asignar
              </button>
            </div>

            <button
              onClick={fillMissingStockDefaults}
              title="Pone stock mínimo 5 y óptimo 20 donde estén vacíos o en cero"
              className="flex items-center justify-center gap-1.5 px-3.5 h-10 rounded-xl bg-white border border-indigo-100 hover:border-indigo-300 text-[10px] font-black uppercase tracking-wider text-indigo-900 transition-colors shadow-sm"
            >
              <SparklesIcon className="w-3.5 h-3.5 text-indigo-600" />
              Mín/Ópt (5/20)
            </button>
            <button
              onClick={normalizeCategoriesBulk}
              title='Unifica mayúsculas y duplicados de categorías'
              className="flex items-center justify-center gap-1.5 px-3.5 h-10 rounded-xl bg-white border border-indigo-100 hover:border-indigo-300 text-[10px] font-black uppercase tracking-wider text-indigo-900 transition-colors shadow-sm"
            >
              <SparklesIcon className="w-3.5 h-3.5 text-indigo-600" />
              Normalizar Cat.
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

