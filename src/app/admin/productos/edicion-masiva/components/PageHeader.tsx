"use client";

import Button from "@/components/ui/Button";
import {
  ArrowPathIcon,
  ArrowDownTrayIcon,
  CloudArrowUpIcon,
  ArrowUpTrayIcon,
  ClockIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

interface PageHeaderProps {
  isSaving: boolean;
  isImporting: boolean;
  isExporting: boolean;
  isRefreshing: boolean;
  showHistory: boolean;
  setShowHistory: (v: boolean) => void;
  backupsCount: number;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onXlsxImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExport: () => void;
  onRefresh: () => void;
  onDiscard: () => void;
  onSaveAll: () => void;
  hasChanges: boolean;
  changedCount: number;
}

export function saveLabel(n: number) {
  return n === 0 ? "Sin cambios" : `Guardar ${n} ${n === 1 ? "producto" : "productos"}`;
}

const SECONDARY =
  "flex items-center gap-2 px-3.5 h-11 rounded-2xl font-bold border-2 bg-white text-gray-600 border-gray-200 hover:border-brand-300 hover:text-brand-700 transition-colors disabled:opacity-50 shrink-0";

export default function PageHeader({
  isSaving,
  isImporting,
  isExporting,
  isRefreshing,
  showHistory,
  setShowHistory,
  backupsCount,
  fileInputRef,
  onXlsxImport,
  onExport,
  onRefresh,
  onDiscard,
  onSaveAll,
  hasChanges,
  changedCount,
}: PageHeaderProps) {
  // Los mismos botones en escritorio y en el teléfono: antes Importar,
  // Historial y Refrescar no existían en pantallas chicas.
  const secondary = (
    <>
      <button
        onClick={onRefresh}
        disabled={isSaving || isRefreshing}
        title="Vuelve a cargar el catálogo. Tus cambios pendientes se mantienen."
        className={SECONDARY}
      >
        <ArrowPathIcon className={`w-5 h-5 ${isRefreshing ? "animate-spin" : ""}`} />
        Refrescar
      </button>
      <button
        onClick={() => setShowHistory(!showHistory)}
        aria-expanded={showHistory}
        className={
          showHistory
            ? "relative flex items-center gap-2 px-4 h-11 rounded-2xl font-bold border-2 bg-violet-100 text-violet-700 border-violet-200 transition-colors shrink-0"
            : `relative ${SECONDARY}`
        }
      >
        <ClockIcon className="w-5 h-5" />
        Historial
        {backupsCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-violet-600 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center">
            {backupsCount}
          </span>
        )}
      </button>
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={isImporting}
        title="Importa cambios desde un .xlsx (usa Exportar para obtener la plantilla)"
        className={SECONDARY}
      >
        {isImporting ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : <ArrowUpTrayIcon className="w-5 h-5" />}
        Importar
      </button>
      <button onClick={onExport} disabled={isExporting} title="Descarga los productos filtrados en .xlsx" className={SECONDARY}>
        {isExporting ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : <ArrowDownTrayIcon className="w-5 h-5" />}
        Exportar
      </button>
    </>
  );

  return (
    <div className="mb-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="shrink-0">
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight mb-1 uppercase whitespace-nowrap">
            Inventario <span className="text-brand-600 italic">Smart</span>
          </h1>
          <p className="text-sm text-gray-600 font-medium">Gestión rápida de precios y existencias.</p>
        </div>

        <div className="hidden md:flex flex-wrap justify-end gap-2">
          {secondary}
          {hasChanges && (
            <button
              onClick={onDiscard}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 h-11 rounded-2xl font-bold border-2 bg-white text-rose-600 border-rose-200 hover:bg-rose-50 transition-colors disabled:opacity-50"
            >
              <TrashIcon className="w-5 h-5" />
              Descartar
            </button>
          )}
          <Button
            onClick={onSaveAll}
            disabled={!hasChanges || isSaving}
            className={`rounded-2xl px-6 h-11 font-black shadow-xl transition-all ${
              hasChanges ? "bg-brand-600 shadow-brand-500/20" : "bg-gray-400 opacity-50"
            }`}
          >
            {isSaving ? (
              <ArrowPathIcon className="w-5 h-5 animate-spin mr-2" />
            ) : (
              <CloudArrowUpIcon className="w-5 h-5 mr-2" />
            )}
            {isSaving ? "Guardando..." : saveLabel(changedCount)}
          </Button>
        </div>
      </div>

      <div className="md:hidden flex gap-2 mt-3 overflow-x-auto no-scrollbar pb-1">{secondary}</div>

      <input ref={fileInputRef} type="file" accept=".xlsx" className="hidden" onChange={onXlsxImport} />
    </div>
  );
}
