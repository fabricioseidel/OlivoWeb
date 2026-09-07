"use client";

import { useState, useEffect, useMemo } from "react";
import { CheckCircleIcon, SparklesIcon, CheckIcon } from "@heroicons/react/24/outline";
import { BundleConfig, SelectedBundleOption } from "@/types/bundle";

interface PackConfiguratorProps {
  bundleConfig: BundleConfig;
  onOptionsChange?: (options: SelectedBundleOption[], isValid: boolean) => void;
  onChange?: (options: SelectedBundleOption[], isValid: boolean) => void;
}

export default function PackConfigurator({
  bundleConfig,
  onOptionsChange,
  onChange,
}: PackConfiguratorProps) {
  const { fixedItems = [], optionGroups = [] } = bundleConfig;

  // Estado para elecciones individuales (single choice: 1 sabor)
  const [singleChoices, setSingleChoices] = useState<Record<string, string>>({});

  // Estado para elecciones múltiples (multi choice: ej. 4 salsas)
  const [multiChoices, setMultiChoices] = useState<Record<string, Record<string, number>>>({});

  // Inicializar selecciones por defecto
  useEffect(() => {
    const initialSingles: Record<string, string> = {};
    const initialMultis: Record<string, Record<string, number>> = {};

    optionGroups.forEach((group) => {
      if (group.maxQuantity === 1) {
        // Seleccionar la primera opción por defecto si existe
        if (group.options.length > 0) {
          initialSingles[group.id] = group.options[0].name;
        }
      } else {
        initialMultis[group.id] = {};
        // Si hay opciones, distribuir automáticamente hasta completar minQuantity
        if (group.options.length > 0) {
          const firstOpt = group.options[0].name;
          initialMultis[group.id] = { [firstOpt]: group.minQuantity };
        }
      }
    });

    setSingleChoices(initialSingles);
    setMultiChoices(initialMultis);
  }, [optionGroups]);

  // Manejar cambio en multi-selección con botones +/-
  const handleMultiQtyChange = (
    groupId: string,
    optionName: string,
    delta: number,
    maxAllowed: number
  ) => {
    setMultiChoices((prev) => {
      const currentGroup = { ...(prev[groupId] || {}) };
      const currentVal = currentGroup[optionName] || 0;
      
      // Total actual en el grupo
      const currentTotal = Object.values(currentGroup).reduce((acc, v) => acc + v, 0);

      // Si queremos sumar pero ya alcanzamos el tope, no hacemos nada
      if (delta > 0 && currentTotal >= maxAllowed) return prev;

      const nextVal = Math.max(0, currentVal + delta);
      if (nextVal === 0) {
        delete currentGroup[optionName];
      } else {
        currentGroup[optionName] = nextVal;
      }

      return {
        ...prev,
        [groupId]: currentGroup,
      };
    });
  };

  // Calcular validez y opciones formateadas
  const { formattedOptions, isValid } = useMemo(() => {
    const options: SelectedBundleOption[] = [];
    let valid = true;

    optionGroups.forEach((group) => {
      if (group.maxQuantity === 1) {
        const selected = singleChoices[group.id];
        if (group.required && !selected) {
          valid = false;
        } else if (selected) {
          const matchingOpt = group.options.find((o) => o.name === selected);
          options.push({
            groupId: group.id,
            groupTitle: group.title,
            selection: selected,
            items: matchingOpt?.barcode
              ? [{ barcode: matchingOpt.barcode, name: matchingOpt.name, quantity: 1 }]
              : [],
          });
        }
      } else {
        const groupSelections = multiChoices[group.id] || {};
        const total = Object.values(groupSelections).reduce((acc, v) => acc + v, 0);

        if (group.required && total < group.minQuantity) {
          valid = false;
        }

        const items: { barcode: string; name: string; quantity: number }[] = [];
        Object.entries(groupSelections).forEach(([name, qty]) => {
          if (qty > 0) {
            const matchingOpt = group.options.find((o) => o.name === name);
            if (matchingOpt?.barcode) {
              items.push({
                barcode: matchingOpt.barcode,
                name: matchingOpt.name,
                quantity: qty,
              });
            }
          }
        });

        const summary = Object.entries(groupSelections)
          .filter(([_, qty]) => qty > 0)
          .map(([name, qty]) => `${qty}x ${name}`)
          .join(", ");

        if (summary) {
          options.push({
            groupId: group.id,
            groupTitle: group.title,
            selection: summary,
            items,
          });
        }
      }
    });

    return { formattedOptions: options, isValid: valid };
  }, [optionGroups, singleChoices, multiChoices]);

  // Notificar al componente padre
  const notifyParent = onOptionsChange || onChange;
  useEffect(() => {
    if (notifyParent) {
      notifyParent(formattedOptions, isValid);
    }
  }, [formattedOptions, isValid, notifyParent]);

  return (
    <div className="space-y-6 my-6 border-t border-b border-neutral-100 py-6">
      {/* 1. Ítems fijos incluidos */}
      {fixedItems.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-800 flex items-center gap-1.5">
            <CheckCircleIcon className="size-5 text-emerald-600" />
            Este Pack incluye:
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {fixedItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-2.5 bg-neutral-50 rounded-xl p-3 border border-neutral-200/80"
              >
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800">
                  {item.quantity}×
                </span>
                <span className="text-sm font-medium text-neutral-800 leading-snug">
                  {item.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Grupos de opciones personalizables */}
      {optionGroups.length > 0 && (
        <div className="space-y-5">
          {optionGroups.map((group) => {
            const isSingle = group.maxQuantity === 1;

            if (isSingle) {
              const selectedValue = singleChoices[group.id] || "";

              return (
                <div key={group.id} className="space-y-2.5">
                  <div className="flex items-baseline justify-between">
                    <label className="text-sm font-bold text-neutral-900 flex items-center gap-1.5">
                      <SparklesIcon className="size-4 text-brand-600" />
                      {group.title}
                    </label>
                    {group.subtitle && (
                      <span className="text-xs text-neutral-500">{group.subtitle}</span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {group.options.map((opt) => {
                      const isSelected = selectedValue === opt.name;
                      const isOutOfStock = opt.stock !== undefined && opt.stock <= 0;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          disabled={isOutOfStock}
                          onClick={() => {
                            if (!isOutOfStock) {
                              setSingleChoices((prev) => ({ ...prev, [group.id]: opt.name }));
                            }
                          }}
                          className={`relative flex items-center justify-between rounded-xl border p-3 text-left text-xs font-semibold transition-all ${
                            isOutOfStock
                              ? "border-neutral-200 bg-neutral-100 text-neutral-400 opacity-60 cursor-not-allowed"
                              : isSelected
                              ? "border-brand-600 bg-brand-50 text-brand-900 ring-2 ring-brand-500/20 shadow-sm"
                              : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50"
                          }`}
                        >
                          <span className="truncate pr-2">
                            {opt.name} {isOutOfStock ? "(Agotado)" : ""}
                          </span>
                          {isSelected && !isOutOfStock && (
                            <CheckIcon className="size-4 shrink-0 text-brand-600" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            }

            // Multi-choice (ej. seleccionar 4 salsas)
            const currentGroup = multiChoices[group.id] || {};
            const currentTotal = Object.values(currentGroup).reduce((acc, v) => acc + v, 0);
            const isComplete = currentTotal === group.maxQuantity;

            return (
              <div key={group.id} className="space-y-3 p-4 bg-neutral-50 rounded-2xl border border-neutral-200">
                <div className="flex items-baseline justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-neutral-900 flex items-center gap-1.5">
                      <SparklesIcon className="size-4 text-brand-600" />
                      {group.title}
                    </h4>
                    {group.subtitle && (
                      <p className="text-xs text-neutral-500 mt-0.5">{group.subtitle}</p>
                    )}
                  </div>
                  <span
                    className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                      isComplete
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-900"
                    }`}
                  >
                    {currentTotal} de {group.maxQuantity} seleccionadas
                  </span>
                </div>

                <div className="divide-y divide-neutral-200/80 bg-white rounded-xl border border-neutral-200 overflow-hidden">
                  {group.options.map((opt) => {
                    const count = currentGroup[opt.name] || 0;
                    return (
                      <div
                        key={opt.id}
                        className="flex items-center justify-between p-3 text-xs sm:text-sm"
                      >
                        <span className="font-medium text-neutral-800">
                          {opt.name} {opt.stock !== undefined && opt.stock <= 0 ? "(Agotado)" : ""}
                        </span>

                        <div className="flex items-center border border-neutral-300 rounded-lg">
                          <button
                            type="button"
                            onClick={() =>
                              handleMultiQtyChange(group.id, opt.name, -1, group.maxQuantity)
                            }
                            disabled={count <= 0}
                            className="px-2.5 py-1 text-neutral-600 hover:bg-neutral-100 disabled:opacity-30 rounded-l-lg"
                          >
                            -
                          </button>
                          <span className="w-8 text-center font-bold text-neutral-900">
                            {count}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              handleMultiQtyChange(group.id, opt.name, 1, group.maxQuantity)
                            }
                            disabled={
                              currentTotal >= group.maxQuantity ||
                              (opt.stock !== undefined && count >= opt.stock)
                            }
                            className="px-2.5 py-1 text-neutral-600 hover:bg-neutral-100 disabled:opacity-30 rounded-r-lg"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
