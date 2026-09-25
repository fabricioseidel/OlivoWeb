"use client";

import { useMemo } from "react";
import {
  ArrowsRightLeftIcon,
  CheckBadgeIcon,
  EyeSlashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { buildMergePlan, getStock, getVerifiedAt, type DuplicateGroup } from "../lib";

interface DuplicatesPanelProps {
  groups: DuplicateGroup[];
  dismissed: Set<string>;
  onDismiss: (groupId: string) => void;
  onMerge: (group: DuplicateGroup) => void;
  onMergeAll: (groups: DuplicateGroup[]) => void;
  onClose: () => void;
}

function fechaCorta(valor: number | null): string {
  if (valor === null) return "nunca contado";
  return new Date(valor).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Revisión de duplicados: el mismo producto cargado dos veces con códigos de
 * barra distintos. Se conserva el código que se escaneó en el conteo más
 * reciente —es el que está en el envase que hoy está en la góndola— y se
 * rescatan hacia él los datos que habían quedado en la fila vieja.
 *
 * Fusionar acá no escribe nada: deja los cambios pendientes para revisarlos y
 * guardarlos con el resto.
 */
export default function DuplicatesPanel({
  groups,
  dismissed,
  onDismiss,
  onMerge,
  onMergeAll,
  onClose,
}: DuplicatesPanelProps) {
  const pendientes = useMemo(
    () => groups.filter((g) => !dismissed.has(g.id)),
    [groups, dismissed]
  );

  return (
    <div className="bg-white rounded-[2rem] p-4 md:p-5 shadow-xl shadow-gray-200/50 border-2 border-amber-200 mb-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="text-sm font-black uppercase tracking-widest text-amber-700 flex items-center gap-2">
            <ArrowsRightLeftIcon className="w-4 h-4" />
            Posibles duplicados ({pendientes.length})
          </h2>
          <p className="text-xs text-gray-500 font-medium mt-1 max-w-2xl">
            El mismo producto en dos filas, con dos códigos de barra. Se conserva el que se
            escaneó en el último conteo y se le pasan los datos que habían quedado en la otra
            (precio, costo, foto). El stock se suma sólo si las dos filas se contaron en el mismo
            recorrido. Las filas repetidas quedan ocultas y en 0 — no se borran, porque tienen
            ventas y movimientos colgando.
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors shrink-0"
          title="Cerrar"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>

      {pendientes.length > 1 && (
        <button
          onClick={() => onMergeAll(pendientes)}
          className="mb-3 px-4 h-10 rounded-xl bg-amber-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-amber-700 transition-colors shadow-sm"
        >
          Unificar los {pendientes.length} grupos (pendiente guardar)
        </button>
      )}

      {pendientes.length === 0 && (
        <p className="py-8 text-center text-sm font-bold text-gray-400 italic">
          No quedan duplicados por revisar.
        </p>
      )}

      <div className="space-y-3 max-h-[32rem] overflow-y-auto pr-1">
        {pendientes.map((group) => {
          const plan = buildMergePlan(group);
          const stockKeeper = getStock(group.keeper);

          return (
            <div key={group.id} className="rounded-2xl border border-amber-100 bg-amber-50/40 p-3">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-[9px] font-black uppercase tracking-wider text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                  coincide por {group.reasons.join(" y ")}
                </span>
                {plan.stockSumado && (
                  <span className="text-[9px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                    stock {stockKeeper} → {plan.stockFinal} (sumado)
                  </span>
                )}
                {plan.rescued.length > 0 && (
                  <span className="text-[9px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded">
                    rescata {plan.rescued.join(", ")}
                  </span>
                )}
              </div>

              <ul className="space-y-1.5">
                {[group.keeper, ...group.others].map((p) => {
                  const esKeeper = p.id === group.keeper.id;
                  return (
                    <li
                      key={p.id}
                      className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-xs rounded-xl px-2.5 py-2 ${
                        esKeeper
                          ? "bg-white border border-emerald-200"
                          : "bg-white/60 border border-gray-200 text-gray-500"
                      }`}
                    >
                      {esKeeper ? (
                        <CheckBadgeIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <EyeSlashIcon className="w-4 h-4 text-gray-400 shrink-0" />
                      )}
                      <span className={`font-bold ${esKeeper ? "text-gray-900" : ""}`}>{p.name}</span>
                      <span className="font-mono text-[10px] text-gray-400">{p.id}</span>
                      <span className="font-bold">stock {getStock(p)}</span>
                      <span>${Number(p.price ?? 0).toLocaleString("es-CL")}</span>
                      <span className="text-[10px] italic">{fechaCorta(getVerifiedAt(p))}</span>
                      {esKeeper && (
                        <span className="text-[9px] font-black uppercase tracking-wider text-emerald-700 ml-auto">
                          se conserva
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>

              <div className="flex gap-2 mt-2.5">
                <button
                  onClick={() => onMerge(group)}
                  className="px-3.5 h-9 rounded-xl bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-colors"
                >
                  Unificar en {group.keeper.id}
                </button>
                <button
                  onClick={() => onDismiss(group.id)}
                  className="px-3.5 h-9 rounded-xl bg-white border border-gray-200 text-gray-500 text-[10px] font-black uppercase tracking-widest hover:border-gray-400 transition-colors"
                  title="Son productos distintos: sacarlo de la lista"
                >
                  No son el mismo
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
