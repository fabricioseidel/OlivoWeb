"use client";

import {
  ClockIcon,
  ArrowUturnLeftIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { MAX_BACKUPS, type Backup } from "../lib";

interface HistoryPanelProps {
  backups: Backup[];
  onClose: () => void;
  onRestore: (backup: Backup) => void;
  onDelete: (backupId: string) => void;
}

export default function HistoryPanel({ backups, onClose, onRestore, onDelete }: HistoryPanelProps) {
  return (
    <div className="mb-6 bg-white rounded-[2rem] border border-violet-100 shadow-xl shadow-violet-100/30 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-violet-50 bg-violet-50/50">
        <div className="flex items-center gap-3">
          <ClockIcon className="w-5 h-5 text-violet-500" />
          <span className="font-black text-violet-900 uppercase tracking-widest text-sm">Historial de Backups</span>
          <span className="text-xs text-violet-500 font-medium">({backups.length}/{MAX_BACKUPS} guardados)</span>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
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
                  onClick={() => onRestore(backup)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 text-white text-xs font-black hover:bg-violet-700 transition-colors"
                >
                  <ArrowUturnLeftIcon className="w-3.5 h-3.5" />
                  Restaurar
                </button>
                <button
                  onClick={() => onDelete(backup.id)}
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
  );
}
