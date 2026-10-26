"use client";

import { useState } from "react";
import { parseLocaleNumber, type ProductChanges } from "../lib";

interface NumberCellProps {
  value: number | null | undefined;
  /** Columna de la grilla: Enter / ↑ ↓ saltan a la misma columna de otra fila. */
  field: keyof ProductChanges;
  rowIndex: number;
  /** Recibe el texto ya validado ("" sólo si `allowEmpty`). */
  onCommit: (text: string) => void;
  /** Pegar varias líneas (una columna copiada de Excel) las reparte hacia abajo. */
  onPasteColumn?: (values: string[]) => void;
  /** Vacío es un valor válido (oferta: sin oferta; costo: sin costo). */
  allowEmpty?: boolean;
  integer?: boolean;
  prefix?: string;
  label: string;
  placeholder?: string;
  title?: string;
  /** Tamaño y forma del input. */
  sizeClass: string;
  /** Colores según el estado (sin cambios, editado, alerta). */
  stateClass: string;
}

/**
 * Celda numérica de la grilla.
 *
 * Mientras se escribe, el texto vive en un borrador local: así se puede
 * borrar el campo entero para escribir otro número (antes, al quedar vacío,
 * volvía de golpe al valor original). Sólo se comunican valores válidos; uno
 * negativo o vacío donde no corresponde se marca en rojo y, al salir de la
 * celda, se vuelve al último valor bueno.
 *
 * La rueda del mouse no cambia el número (la celda pierde el foco) y las
 * flechas ↑ ↓ mueven entre filas en vez de sumar o restar 1.
 */
export default function NumberCell({
  value,
  field,
  rowIndex,
  onCommit,
  onPasteColumn,
  allowEmpty = false,
  integer = false,
  prefix,
  label,
  placeholder,
  title,
  sizeClass,
  stateClass,
}: NumberCellProps) {
  const [draft, setDraft] = useState<string | null>(null);

  const isValid = (text: string) => {
    if (text === "") return allowEmpty;
    const n = Number(text);
    return Number.isFinite(n) && n >= 0 && (!integer || Number.isInteger(n));
  };

  const shown = draft ?? (value === null || value === undefined || Number.isNaN(value) ? "" : String(value));
  const invalid = draft !== null && !isValid(draft);

  const commit = (text: string) => {
    setDraft(text);
    if (isValid(text)) onCommit(text);
  };

  const move = (input: HTMLInputElement, delta: number) => {
    const scope = input.closest("[data-grid-scope]");
    const next = scope?.querySelector<HTMLInputElement>(
      `input[data-grid-col="${field}"][data-grid-row="${rowIndex + delta}"]`
    );
    if (next) {
      next.focus();
      next.select();
    }
  };

  return (
    <div className="relative w-full">
      {prefix && (
        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 pointer-events-none">
          {prefix}
        </span>
      )}
      <input
        type="number"
        inputMode={integer ? "numeric" : "decimal"}
        min={0}
        step={integer ? 1 : "any"}
        aria-label={label}
        aria-invalid={invalid || undefined}
        title={invalid ? (draft === "" ? "Este campo no puede quedar vacío" : "Valor no válido") : title}
        placeholder={placeholder}
        value={shown}
        data-grid-col={field}
        data-grid-row={rowIndex}
        onChange={(e) => commit(e.target.value)}
        onBlur={() => setDraft(null)}
        onWheel={(e) => e.currentTarget.blur()}
        onKeyDown={(e) => {
          if ((e.key === "Enter" && e.shiftKey) || e.key === "ArrowUp") {
            e.preventDefault();
            move(e.currentTarget, -1);
          } else if (e.key === "Enter" || e.key === "ArrowDown") {
            e.preventDefault();
            move(e.currentTarget, 1);
          } else if (e.key === "Escape" && draft !== null) {
            setDraft(null);
          }
        }}
        onPaste={(e) => {
          const text = e.clipboardData.getData("text");
          const lines = text.replace(/\r/g, "").split("\n");
          while (lines.length > 0 && lines[lines.length - 1].trim() === "") lines.pop();
          if (lines.length > 1 && onPasteColumn) {
            e.preventDefault();
            onPasteColumn(lines.map((l) => l.split("\t")[0].trim()));
            return;
          }
          // Un solo valor con formato ("$ 1.990"): el input numérico lo
          // rechazaría entero, así que se lee acá.
          const single = lines[0]?.split("\t")[0].trim() ?? "";
          if (single && !/^\d+(\.\d+)?$/.test(single)) {
            const n = parseLocaleNumber(single);
            if (n !== null) {
              e.preventDefault();
              commit(String(n));
            }
          }
        }}
        className={`w-full ${sizeClass} ${prefix ? "pl-5" : ""} text-right font-black tabular-nums transition-all focus:outline-none focus:ring-4 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${
          invalid ? "border-rose-500 bg-rose-50 text-rose-700 focus:ring-rose-500/15" : stateClass
        }`}
      />
    </div>
  );
}
