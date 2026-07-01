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
} from "@heroicons/react/24/outline";

interface FiltersToolbarProps {
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  filterLowStock: boolean;
  setFilterLowStock: (v: boolean) => void;
  filterWithImage: boolean;
  setFilterWithImage: (v: boolean) => void;
  filterReady: "all" | "ready" | "pending";
  setFilterReady: (v: "all" | "ready" | "pending") => void;
  readyCount: number;
  totalProductsCount: number;
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
  applyBulkAdjustment: (type: "price_percent" | "price_fixed" | "stock_fixed", value: number) => void;
  bulkCategory: string;
  setBulkCategory: (v: string) => void;
  assignCategoryToTargets: (cat: string) => void;
  fillMissingStockDefaults: () => void;
  normalizeCategoriesBulk: () => void;
}

export default function FiltersToolbar({
  searchTerm,
  setSearchTerm,
  filterLowStock,
  setFilterLowStock,
  filterWithImage,
  setFilterWithImage,
  filterReady,
  setFilterReady,
  readyCount,
  totalProductsCount,
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
  applyBulkAdjustment,
  bulkCategory,
  setBulkCategory,
  assignCategoryToTargets,
  fillMissingStockDefaults,
  normalizeCategoriesBulk,
}: FiltersToolbarProps) {
  return (
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
            <span>Incompletos ({totalProductsCount - readyCount})</span>
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
            {backupsCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-violet-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center">
                {backupsCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {showBulkActions && (
        <div className="mt-4 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 animate-in slide-in-from-top-2 duration-300 space-y-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
            {selectedCount > 0
              ? `Se aplicarán a los ${selectedCount} productos seleccionados`
              : `Se aplicarán a los ${filteredCount} productos filtrados`}
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
  );
}
