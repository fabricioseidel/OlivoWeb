"use client";

import { TrashIcon } from "@heroicons/react/24/outline";

interface MobileSaveBarProps {
  hasChanges: boolean;
  changedCount: number;
  isSaving: boolean;
  onSaveAll: () => void;
  onDiscard: () => void;
}

export default function MobileSaveBar({ hasChanges, changedCount, isSaving, onSaveAll, onDiscard }: MobileSaveBarProps) {
  // Sólo aparece cuando hay algo que guardar: antes ocupaba el pie de la
  // pantalla siempre, con "Sin cambios listos".
  if (!hasChanges && !isSaving) return null;

  return (
    <div className="md:hidden fixed bottom-4 left-4 right-4 z-50">
      <div className="bg-gray-950/95 backdrop-blur-md rounded-3xl p-3 shadow-2xl border border-white/10 flex items-center justify-between gap-3">
        <div className="flex flex-col min-w-0 pl-1">
          <span className="text-[11px] font-black text-brand-300 uppercase tracking-wider whitespace-nowrap">Sin guardar</span>
          <span className="text-white text-sm font-bold truncate">
            {changedCount} {changedCount === 1 ? "producto" : "productos"}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onDiscard}
            disabled={isSaving}
            aria-label="Descartar cambios"
            className="h-12 w-12 rounded-2xl bg-white/10 text-white/80 flex items-center justify-center active:scale-95 disabled:opacity-40"
          >
            <TrashIcon className="w-5 h-5" />
          </button>
          <button
            onClick={onSaveAll}
            disabled={!hasChanges || isSaving}
            className="h-12 px-5 rounded-2xl font-black text-xs uppercase tracking-wider bg-brand-500 text-white shadow-lg active:scale-95 disabled:opacity-60"
          >
            {isSaving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
