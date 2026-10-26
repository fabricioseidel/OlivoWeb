"use client";

import {
  ClockIcon,
  ArrowUturnLeftIcon,
  XMarkIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { MAX_BACKUPS, type Backup } from "../lib";

interface HistoryPanelProps {
  backups: Backup[];
  onClose: () => void;
  onRestore: (backup: Backup) => void;
  onDelete: (backup: Backup) => void;
}

export default function HistoryPanel({ backups, onClose, onRestore, onDelete }: HistoryPanelProps) {
  return (
    <div className="mb-5 bg-white rounded-[2rem] border border-violet-100 shadow-xl shadow-violet-100/30 overflow-hidden">
      <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-violet-50 bg-violet-50/50">
        <div>
          <div className="flex items-center gap-3">
            <ClockIcon className="w-5 h-5 text-violet-600" />
            <span className="font-black text-violet-900 uppercase tracking-wider text-sm">Historial de backups</span>
            <span className="text-xs text-violet-600 font-medium">
              ({backups.length}/{MAX_BACKUPS})
            </span>
          </div>
          <p className="text-xs text-gray-600 mt-1">
            Se crea uno antes de cada guardado, con el estado anterior de los productos que cambiaron. Viven en este
            navegador: en otro equipo no aparecen.
          </p>
        </div>
        <button onClick={onClose} aria-label="Cerrar historial" className="text-gray-500 hover:text-gray-800 transition-colors">
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>

      {backups.length === 0 ? (
        <div className="py-10 text-center text-gray-500 text-sm font-medium">
          No hay backups guardados aún. Se crean automáticamente al guardar cambios.
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {backups.map((backup, i) => (
            <div key={backup.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 hover:bg-violet-50/30 transition-colors">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-violet-100 flex items-center justify-center text-violet-700 font-black text-xs shrink-0">
                  {i + 1}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-800 truncate">{backup.label}</p>
                  <p className="text-xs text-gray-500 font-medium">
                    {new Date(backup.timestamp).toLocaleString("es-CL")} · {backup.products.length}{" "}
                    {backup.products.length === 1 ? "producto" : "productos"}
                  </p>
                </div>
              </div>
              {/* Siempre visibles: antes aparecían sólo al pasar el mouse y en
                  pantallas táctiles no había forma de llegar a ellos. */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onRestore(backup)}
                  className="flex items-center gap-1.5 px-4 h-9 rounded-xl bg-violet-600 text-white text-xs font-black hover:bg-violet-700 transition-colors"
                >
                  <ArrowUturnLeftIcon className="w-3.5 h-3.5" />
                  Restaurar
                </button>
                <button
                  onClick={() => onDelete(backup)}
                  aria-label={`Eliminar backup ${backup.label}`}
                  title="Eliminar backup"
                  className="p-2 rounded-xl text-gray-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
