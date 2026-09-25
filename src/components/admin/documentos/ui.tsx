"use client";

/**
 * Piezas compartidas de la gestión documental: modal, botones, campos,
 * semáforo de vencimientos y formato de montos y fechas.
 *
 * El semáforo nunca comunica sólo con color: siempre va con ícono y texto
 * ("vence en 3 días", "venció"), porque quien no distingue rojo de verde
 * tiene que poder leerlo igual.
 */

import React, { Fragment, ReactNode } from "react";
import { Dialog, Transition } from "@headlessui/react";
import {
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { formatCLP } from "@/utils/currency";
import { fechaCorta, nombrePeriodo, periodoSiguiente, textoPlazo, urgencia } from "@/lib/documentos/vencimientos";
import { TIPOS_DOCUMENTO, type TipoDocumento } from "@/lib/documentos/tipos";

export const pesos = (n: number | null | undefined) => (n == null ? "—" : formatCLP(Math.round(n)));
export const fecha = (iso: string | null | undefined) => (iso ? fechaCorta(iso) : "—");
export const nombreTipo = (t: TipoDocumento) => TIPOS_DOCUMENTO[t]?.corto ?? t;

/** fetch que devuelve el JSON o lanza con el mensaje del servidor. */
export async function pedir<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: "no-store", ...init });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(body?.error || `Error ${res.status}`), { status: res.status, body });
  return body as T;
}

export const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

// ─── Botones y campos ───────────────────────────────────────────────────

type BotonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: "primario" | "secundario" | "peligro" | "suave";
  icono?: ReactNode;
  cargando?: boolean;
};

const variantes = {
  primario: "bg-brand-700 hover:bg-brand-800 text-white shadow-sm",
  secundario: "bg-white text-gray-800 ring-1 ring-gray-300 hover:ring-brand-400 hover:text-brand-800",
  peligro: "bg-white text-rose-700 ring-1 ring-rose-200 hover:bg-rose-50",
  suave: "bg-brand-50 text-brand-800 hover:bg-brand-100",
};

export function Boton({ variante = "primario", icono, cargando, className = "", children, disabled, ...rest }: BotonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || cargando}
      className={`inline-flex items-center justify-center gap-1.5 min-h-[40px] px-4 rounded-xl text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 ${variantes[variante]} ${className}`}
    >
      {cargando ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : icono}
      {children}
    </button>
  );
}

export function Campo({
  etiqueta,
  ayuda,
  error,
  children,
  className = "",
}: {
  etiqueta: string;
  ayuda?: ReactNode;
  error?: string | null;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block min-w-0 ${className}`}>
      <span className="block text-xs font-bold text-gray-700 mb-1">{etiqueta}</span>
      {children}
      {error ? (
        <span className="mt-1 block text-xs font-semibold text-rose-700">{error}</span>
      ) : ayuda ? (
        <span className="mt-1 block text-xs text-gray-500">{ayuda}</span>
      ) : null}
    </label>
  );
}

export const claseInput =
  "w-full min-h-[40px] rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 disabled:bg-gray-50";

export function Tarjeta({ titulo, accion, children, className = "" }: { titulo?: ReactNode; accion?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl bg-white ring-1 ring-gray-200 p-4 sm:p-5 min-w-0 ${className}`}>
      {(titulo || accion) && (
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          {titulo && <h2 className="text-sm font-black uppercase tracking-wider text-gray-800">{titulo}</h2>}
          {accion}
        </div>
      )}
      {children}
    </section>
  );
}

// ─── Modal ──────────────────────────────────────────────────────────────

export function Modal({
  abierto,
  onCerrar,
  titulo,
  children,
  ancho = "max-w-2xl",
}: {
  abierto: boolean;
  onCerrar: () => void;
  titulo: string;
  children: ReactNode;
  ancho?: string;
}) {
  return (
    <Transition.Root show={abierto} as={Fragment}>
      <Dialog as="div" className="relative z-[110]" onClose={onCerrar}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-950/60 backdrop-blur-sm" />
        </Transition.Child>
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-end sm:items-center justify-center p-0 sm:p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 translate-y-4"
              enterTo="opacity-100 translate-y-0"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 translate-y-0"
              leaveTo="opacity-0 translate-y-4"
            >
              <Dialog.Panel className={`w-full ${ancho} rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl`}>
                <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
                  <Dialog.Title className="text-base sm:text-lg font-black text-gray-900">{titulo}</Dialog.Title>
                  <button
                    type="button"
                    onClick={onCerrar}
                    className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                    aria-label="Cerrar"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
                <div className="px-5 py-4 max-h-[80vh] overflow-y-auto">{children}</div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}

// ─── Semáforo ───────────────────────────────────────────────────────────

const estilosUrgencia = {
  vencido: { clase: "bg-rose-100 text-rose-800", Icono: XCircleIcon },
  urgente: { clase: "bg-amber-100 text-amber-900", Icono: ExclamationTriangleIcon },
  proximo: { clase: "bg-amber-50 text-amber-800", Icono: ClockIcon },
  tranquilo: { clase: "bg-brand-50 text-brand-800", Icono: ClockIcon },
  pagado: { clase: "bg-brand-100 text-brand-800", Icono: CheckCircleIcon },
};

export function Plazo({ hoy, vence, pagado }: { hoy: string; vence: string; pagado?: boolean }) {
  const clave = pagado ? "pagado" : urgencia(hoy, vence);
  const { clase, Icono } = estilosUrgencia[clave];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold whitespace-nowrap ${clase}`}>
      <Icono className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {pagado ? "Pagado" : textoPlazo(hoy, vence)}
    </span>
  );
}

const estilosEstado: Record<string, string> = {
  borrador: "bg-gray-100 text-gray-800",
  emitido: "bg-brand-100 text-brand-800",
  anulado: "bg-gray-200 text-gray-700 line-through",
  error: "bg-rose-100 text-rose-800",
  pendiente: "bg-amber-100 text-amber-900",
  aceptado: "bg-brand-100 text-brand-800",
  reclamado: "bg-rose-100 text-rose-800",
};

const nombresEstado: Record<string, string> = {
  borrador: "Borrador",
  emitido: "Emitido",
  anulado: "Anulado",
  error: "Rechazado",
  pendiente: "Por revisar",
  aceptado: "Aceptada",
  reclamado: "Reclamada",
};

export function Estado({ estado }: { estado: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold whitespace-nowrap ${estilosEstado[estado] ?? "bg-gray-100 text-gray-700"}`}>
      {nombresEstado[estado] ?? estado}
    </span>
  );
}

// ─── Selector de mes ────────────────────────────────────────────────────

export function SelectorMes({ periodo, onCambiar }: { periodo: string; onCambiar: (p: string) => void }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-xl bg-white ring-1 ring-gray-200 p-1">
      <button
        type="button"
        onClick={() => onCambiar(periodoSiguiente(periodo, -1))}
        className="p-2 rounded-lg text-gray-600 hover:bg-gray-100"
        aria-label="Mes anterior"
      >
        <ChevronLeftIcon className="h-4 w-4" />
      </button>
      <span className="px-2 text-sm font-bold text-gray-900 capitalize min-w-[130px] text-center">{nombrePeriodo(periodo)}</span>
      <button
        type="button"
        onClick={() => onCambiar(periodoSiguiente(periodo, 1))}
        className="p-2 rounded-lg text-gray-600 hover:bg-gray-100"
        aria-label="Mes siguiente"
      >
        <ChevronRightIcon className="h-4 w-4" />
      </button>
    </div>
  );
}
