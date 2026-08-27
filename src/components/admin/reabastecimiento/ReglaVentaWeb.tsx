"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  NoSymbolIcon,
} from "@heroicons/react/24/outline";

import { useToast } from "@/contexts/ToastContext";
import type { ImpactoRegla, MotivoNoVendible } from "@/server/sellable.service";

/**
 * La regla de venta web, con su consecuencia a la vista.
 *
 * El interruptor y el recuento de lo que quedaría fuera van juntos a propósito.
 * Separarlos dejaría el interruptor a un clic de distancia de su efecto, que es
 * exactamente cómo se enciende algo sin mirar — y encenderlo con el catálogo
 * sin depurar saca del aire casi todo, porque ningún precio arranca revisado.
 */

const ETIQUETA_MOTIVO: Record<MotivoNoVendible, string> = {
  "sin-costo": "sin costo",
  "sin-revisar": "sin revisar",
};

export default function ReglaVentaWeb({ onCambio }: { onCambio?: () => void }) {
  const { showToast } = useToast();
  const [impacto, setImpacto] = useState<ImpactoRegla | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [verLista, setVerLista] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const res = await fetch("/api/admin/precios/regla", { cache: "no-store" });
      if (!res.ok) throw new Error("No se pudo calcular el impacto de la regla");
      setImpacto(await res.json());
    } catch (error: any) {
      showToast(error.message || "Error cargando la regla", "error");
    } finally {
      setCargando(false);
    }
  }, [showToast]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const cambiar = useCallback(
    async (activa: boolean) => {
      if (!impacto) return;

      // Encenderla con productos bloqueados los saca del aire ahora mismo. Es
      // reversible, pero mientras tanto son ventas que no entran, así que se
      // pide confirmación con el número delante.
      if (activa && impacto.bloqueados.length > 0) {
        const seguro = window.confirm(
          `${impacto.bloqueados.length} de ${impacto.total} productos dejarán de poder venderse por la web hasta que se les cargue el costo y se revise su precio.\n\n¿Encender la regla igual?`
        );
        if (!seguro) return;
      }

      setGuardando(true);
      try {
        const res = await fetch("/api/admin/precios/regla", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ activa }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "No se pudo guardar");

        showToast(activa ? "Regla encendida" : "Regla apagada", "success");
        await cargar();
        onCambio?.();
      } catch (error: any) {
        showToast(error.message || "Error guardando la regla", "error");
      } finally {
        setGuardando(false);
      }
    },
    [impacto, cargar, onCambio, showToast]
  );

  if (cargando && !impacto) {
    return (
      <div className="rounded-2xl bg-white p-4 text-sm text-gray-500 ring-1 ring-gray-200">
        Comprobando la regla de venta web…
      </div>
    );
  }

  if (!impacto) return null;

  const bloqueados = impacto.bloqueados.length;
  const limpio = bloqueados === 0;

  return (
    <div
      className={`rounded-2xl p-4 ring-1 ${
        impacto.activa
          ? "bg-brand-50 ring-brand-200"
          : limpio
            ? "bg-white ring-gray-200"
            : "bg-amber-50 ring-amber-200"
      }`}
    >
      <div className="flex flex-wrap items-start gap-3">
        {impacto.activa ? (
          <ShieldCheckIcon className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
        ) : (
          <NoSymbolIcon className="mt-0.5 h-5 w-5 shrink-0 text-gray-400" />
        )}

        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-gray-900">
            Regla de venta web {impacto.activa ? "activa" : "apagada"}
          </div>
          <p className="mt-0.5 text-xs text-gray-600">
            Sólo se vende por la web lo que tiene costo de proveedor cargado y
            precio de venta revisado.
          </p>

          {impacto.activa ? (
            bloqueados > 0 ? (
              <p className="mt-2 text-xs font-semibold text-brand-900">
                {bloqueados} de {impacto.total} productos no se están vendiendo
                por la web ahora mismo.
              </p>
            ) : (
              <p className="mt-2 text-xs font-semibold text-brand-900">
                Los {impacto.total} productos activos cumplen la regla.
              </p>
            )
          ) : limpio ? (
            <p className="mt-2 text-xs font-semibold text-brand-700">
              Encenderla ahora no dejaría ningún producto fuera.
            </p>
          ) : (
            <div className="mt-2 flex items-start gap-1.5 text-xs text-amber-900">
              <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <span>
                Si se encendiera, <strong>{bloqueados} de {impacto.total}</strong>{" "}
                productos dejarían de venderse: {impacto.sinCosto} sin costo
                cargado y {impacto.sinRevisar} con el precio sin revisar.
              </span>
            </div>
          )}

          {bloqueados > 0 && (
            <button
              type="button"
              onClick={() => setVerLista((v) => !v)}
              className="mt-2 text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-gray-900"
            >
              {verLista ? "Ocultar la lista" : "Ver cuáles"}
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => cambiar(!impacto.activa)}
          disabled={guardando}
          className={`shrink-0 rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 ${
            impacto.activa
              ? "bg-white text-gray-700 ring-1 ring-gray-300 hover:bg-gray-50"
              : "bg-gray-900 text-white hover:bg-gray-700"
          }`}
        >
          {guardando ? "Guardando…" : impacto.activa ? "Apagar" : "Encender"}
        </button>
      </div>

      {verLista && bloqueados > 0 && (
        <ul className="mt-3 max-h-64 space-y-1 overflow-auto border-t border-black/5 pt-3">
          {impacto.bloqueados.map((b) => (
            <li key={b.barcode} className="flex flex-wrap items-baseline gap-x-2 text-xs">
              <span className="font-semibold text-gray-900">{b.nombre}</span>
              <span className="font-mono text-[10px] text-gray-400">{b.barcode}</span>
              <span className="text-gray-500">
                {b.motivos.map((m) => ETIQUETA_MOTIVO[m]).join(" · ")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
