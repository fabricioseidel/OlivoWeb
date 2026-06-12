"use client";

interface MobileSaveBarProps {
  hasChanges: boolean;
  changedCount: number;
  isSaving: boolean;
  onSaveAll: () => void;
}

export default function MobileSaveBar({ hasChanges, changedCount, isSaving, onSaveAll }: MobileSaveBarProps) {
  return (
    <div className="md:hidden fixed bottom-6 left-4 right-4 z-50 animate-in slide-in-from-bottom-5 duration-500">
      <div className="bg-gray-950/90 backdrop-blur-md rounded-3xl p-4 shadow-2xl border border-white/10 flex items-center justify-between gap-4">
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest italic">Inventory Manager</span>
          <span className="text-white text-sm font-bold">
            {hasChanges ? `${changedCount} cambios pendientes` : "Sin cambios listos"}
          </span>
        </div>
        <button
          onClick={onSaveAll}
          disabled={!hasChanges || isSaving}
          className={`h-12 px-6 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
            hasChanges ? "bg-emerald-500 text-white shadow-lg active:scale-95" : "bg-white/10 text-white/30"
          }`}
        >
          {isSaving ? "Guardando..." : "Aplicar Todo"}
        </button>
      </div>
    </div>
  );
}
