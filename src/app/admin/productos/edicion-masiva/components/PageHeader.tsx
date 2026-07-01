"use client";

import Button from "@/components/ui/Button";
import {
  ArrowPathIcon,
  CloudArrowUpIcon,
  ArrowUpTrayIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";

interface PageHeaderProps {
  isSaving: boolean;
  isImporting: boolean;
  showHistory: boolean;
  setShowHistory: (v: boolean) => void;
  backupsCount: number;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onXlsxImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSaveAll: () => void;
  hasChanges: boolean;
  changedCount: number;
}

export default function PageHeader({
  isSaving,
  isImporting,
  showHistory,
  setShowHistory,
  backupsCount,
  fileInputRef,
  onXlsxImport,
  onSaveAll,
  hasChanges,
  changedCount,
}: PageHeaderProps) {
  return (
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
          {backupsCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-violet-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center">
              {backupsCount}
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
          onChange={onXlsxImport}
        />
        <Button
          onClick={onSaveAll}
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
  );
}
