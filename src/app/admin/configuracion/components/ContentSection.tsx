"use client";

import { useState } from "react";
import { DocumentTextIcon, ArrowUturnLeftIcon } from "@heroicons/react/24/outline";
import type { StoreSettings } from "@/app/api/admin/settings/route";
import type { HandleChange } from "../lib";
import { COPY_GROUPS, SITE_COPY_DEFAULTS } from "@/lib/site-copy";

interface ContentSectionProps {
  settings: StoreSettings;
  handleChange: HandleChange;
}

const DEFAULTS = SITE_COPY_DEFAULTS as Record<string, string>;

/**
 * Editor de los textos visibles del sitio.
 *
 * Cada campo muestra el texto por defecto como placeholder: si el admin lo deja
 * vacío, la tienda usa ese default. Así borrar un campo restaura el texto
 * original en vez de dejar la página con un hueco.
 */
export default function ContentSection({ settings, handleChange }: ContentSectionProps) {
  const [openGroup, setOpenGroup] = useState<string>(COPY_GROUPS[0]?.id ?? "");
  const copy = settings.siteCopy || {};

  const setCopy = (key: string, value: string) => {
    handleChange(["siteCopy", key], value);
  };

  const overridenCount = Object.entries(copy).filter(
    ([k, v]) => typeof v === "string" && v.trim() !== "" && v !== DEFAULTS[k]
  ).length;

  return (
    <div className="space-y-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <DocumentTextIcon className="h-5 w-5 text-sky-500" />
          Textos del sitio
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Cambia cualquier texto que ven tus clientes. Si dejas un campo vacío, se usa el
          texto original.
          {overridenCount > 0 && (
            <span className="ml-1 font-medium text-slate-700">
              {overridenCount} texto{overridenCount === 1 ? "" : "s"} personalizado
              {overridenCount === 1 ? "" : "s"}.
            </span>
          )}
        </p>
      </div>

      <div className="space-y-2">
        {COPY_GROUPS.map((group) => {
          const isOpen = openGroup === group.id;
          return (
            <div key={group.id} className="overflow-hidden rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setOpenGroup(isOpen ? "" : group.id)}
                className="flex w-full items-center justify-between gap-3 bg-slate-50 px-4 py-3 text-left transition-colors hover:bg-slate-100"
              >
                <span>
                  <span className="block text-sm font-semibold text-slate-900">{group.label}</span>
                  <span className="block text-xs text-slate-500">{group.description}</span>
                </span>
                <span className="shrink-0 text-xs text-slate-400">{isOpen ? "Ocultar" : "Editar"}</span>
              </button>

              {isOpen && (
                <div className="space-y-4 border-t border-slate-200 px-4 py-4">
                  {group.keys.map((key) => {
                    const value = copy[key] ?? "";
                    const fallback = DEFAULTS[key] ?? "";
                    const isLong = fallback.length > 60;
                    const isCustom = value.trim() !== "" && value !== fallback;

                    return (
                      <div key={key}>
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <label
                            htmlFor={`copy-${key}`}
                            className="text-xs font-medium text-slate-600"
                          >
                            {fallback.length > 40 ? `${fallback.slice(0, 40)}…` : fallback}
                          </label>
                          {isCustom && (
                            <button
                              type="button"
                              onClick={() => setCopy(key, "")}
                              className="inline-flex items-center gap-1 text-xs text-slate-400 transition-colors hover:text-slate-700"
                              title="Restaurar el texto original"
                            >
                              <ArrowUturnLeftIcon className="h-3 w-3" />
                              Restaurar
                            </button>
                          )}
                        </div>
                        {isLong ? (
                          <textarea
                            id={`copy-${key}`}
                            value={value}
                            onChange={(e) => setCopy(key, e.target.value)}
                            placeholder={fallback}
                            rows={2}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                          />
                        ) : (
                          <input
                            id={`copy-${key}`}
                            type="text"
                            value={value}
                            onChange={(e) => setCopy(key, e.target.value)}
                            placeholder={fallback}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
