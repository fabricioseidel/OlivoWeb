"use client";

import { useState } from "react";
import { AdjustmentsHorizontalIcon, TrashIcon } from "@heroicons/react/24/outline";

import { useToast } from "@/contexts/ToastContext";
import { formatearMargen, MODOS_REDONDEO, type ModoRedondeo } from "@/lib/pricing";
import type { ReglaCategoria } from "@/server/pricing.service";

/**
 * Márgenes objetivo por categoría.
 *
 * Muestra al lado el margen que cada categoría deja HOY. Fijar la regla a
 * ciegas es como se llegó al problema que arregla esta pantalla: el 35% se
 * eligió una vez y nunca se contrastó contra la realidad. Las bebidas no
 * aguantan lo mismo que un producto de nicho, y acá se ve cuánto aguantan.
 */

const CATEGORIA_POR_DEFECTO = "__default__";

function porcentaje(valor: string): number {
  return Number(valor) / 100;
}

function Fila({
  regla,
  onGuardar,
  onBorrar,
  ocupada,
}: {
  regla: ReglaCategoria;
  onGuardar: (categoria: string, margen: number, redondeo: ModoRedondeo) => Promise<void>;
  onBorrar: (categoria: string) => Promise<void>;
  ocupada: boolean;
}) {
  const esGeneral = regla.categoria === CATEGORIA_POR_DEFECTO;
  const [margen, setMargen] = useState(
    regla.margen !== null ? String(Math.round(regla.margen * 1000) / 10) : ""
  );
  const [redondeo, setRedondeo] = useState<ModoRedondeo>(regla.redondeo ?? "decena");

  const valor = porcentaje(margen);
  const valido = margen !== "" && Number.isFinite(valor) && valor >= 0 && valor < 1;
  const cambiado = valido && (valor !== regla.margen || redondeo !== regla.redondeo);

  return (
    <div className="flex flex-wrap items-center gap-3 border-t border-gray-100 py-3 first:border-t-0">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-gray-900">
          {esGeneral ? "Margen general" : regla.categoria || "Sin categoría"}
        </div>
        <div className="text-[11px] text-gray-400">
          {esGeneral ? (
            "Se aplica a toda categoría que no tenga regla propia"
          ) : (
            <>
              {regla.productos} {regla.productos === 1 ? "producto" : "productos"} · deja hoy{" "}
              <span
                className={
                  regla.margenActual !== null &&
                  regla.margen !== null &&
                  regla.margenActual < regla.margen
                    ? "font-semibold text-amber-600"
                    : "font-semibold text-brand-600"
                }
              >
                {formatearMargen(regla.margenActual)}
              </span>
              {regla.bajoLaRegla > 0 && ` · ${regla.bajoLaRegla} bajo la regla`}
            </>
          )}
        </div>
      </div>

      <label className="flex items-center gap-1.5 text-xs text-gray-500">
        <input
          type="number"
          min={0}
          max={99}
          step={1}
          value={margen}
          onChange={(e) => setMargen(e.target.value)}
          placeholder={esGeneral ? "35" : "usa el general"}
          className="w-20 rounded-lg border border-gray-300 px-2 py-1 text-sm font-semibold text-gray-900 focus:border-brand-500 focus:ring-brand-500"
        />
        %
      </label>

      <select
        value={redondeo}
        onChange={(e) => setRedondeo(e.target.value as ModoRedondeo)}
        className="rounded-lg border border-gray-300 px-2 py-1 text-xs text-gray-700 focus:border-brand-500 focus:ring-brand-500"
        title="Cómo se redondea el precio propuesto. Siempre hacia arriba."
      >
        {MODOS_REDONDEO.map((m) => (
          <option key={m.valor} value={m.valor}>
            {m.etiqueta} ({m.ejemplo})
          </option>
        ))}
      </select>

      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => onGuardar(regla.categoria, valor, redondeo)}
          disabled={ocupada || !cambiado}
          className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-gray-700 disabled:opacity-30"
        >
          Guardar
        </button>
        {!esGeneral && regla.margen !== null && (
          <button
            type="button"
            onClick={() => onBorrar(regla.categoria)}
            disabled={ocupada}
            title="Quitar la regla propia: vuelve a usar el margen general"
            className="rounded-lg px-2 py-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export default function MargenesCategoria({
  categorias,
  margenes,
  onCambio,
}: {
  categorias: ReglaCategoria[];
  margenes: { categoria: string; margen: number; redondeo: ModoRedondeo }[];
  onCambio: () => Promise<void> | void;
}) {
  const { showToast } = useToast();
  const [abierto, setAbierto] = useState(false);
  const [ocupada, setOcupada] = useState<string | null>(null);

  const general = margenes.find((m) => m.categoria === CATEGORIA_POR_DEFECTO);
  const filaGeneral: ReglaCategoria = {
    categoria: CATEGORIA_POR_DEFECTO,
    productos: 0,
    margenActual: null,
    margen: general?.margen ?? null,
    redondeo: general?.redondeo ?? null,
    bajoLaRegla: 0,
  };

  const guardar = async (categoria: string, margen: number, redondeo: ModoRedondeo) => {
    setOcupada(categoria);
    try {
      const res = await fetch("/api/admin/precios/margenes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoria, margen, redondeo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo guardar");
      showToast(`Margen guardado: ${formatearMargen(margen)}`, "success");
      await onCambio();
    } catch (error: any) {
      showToast(error.message || "Error guardando el margen", "error");
    } finally {
      setOcupada(null);
    }
  };

  const borrar = async (categoria: string) => {
    setOcupada(categoria);
    try {
      const res = await fetch(
        `/api/admin/precios/margenes?categoria=${encodeURIComponent(categoria)}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo borrar");
      showToast("Regla quitada: vuelve al margen general", "success");
      await onCambio();
    } catch (error: any) {
      showToast(error.message || "Error quitando la regla", "error");
    } finally {
      setOcupada(null);
    }
  };

  const conRegla = categorias.filter((c) => c.margen !== null).length;

  return (
    <div className="rounded-2xl bg-white ring-1 ring-gray-200">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left"
      >
        <AdjustmentsHorizontalIcon className="h-5 w-5 shrink-0 text-gray-400" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-gray-900">Márgenes por categoría</div>
          <div className="text-[11px] text-gray-400">
            General {formatearMargen(general?.margen ?? null)}
            {conRegla > 0 && ` · ${conRegla} ${conRegla === 1 ? "categoría" : "categorías"} con regla propia`}
          </div>
        </div>
        <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
          {abierto ? "Cerrar" : "Ajustar"}
        </span>
      </button>

      {abierto && (
        <div className="border-t border-gray-100 px-4 pb-3">
          <p className="py-3 text-xs text-gray-500">
            El margen se calcula sobre el precio de venta, no sobre el costo: 35%
            significa vender a costo con IVA dividido 0,65. El redondeo siempre
            sube — hacia abajo se come margen en silencio.
          </p>
          <Fila
            regla={filaGeneral}
            onGuardar={guardar}
            onBorrar={borrar}
            ocupada={ocupada === CATEGORIA_POR_DEFECTO}
          />
          {categorias
            .filter((c) => c.categoria)
            .map((c) => (
              <Fila
                key={c.categoria}
                regla={c}
                onGuardar={guardar}
                onBorrar={borrar}
                ocupada={ocupada === c.categoria}
              />
            ))}
        </div>
      )}
    </div>
  );
}
