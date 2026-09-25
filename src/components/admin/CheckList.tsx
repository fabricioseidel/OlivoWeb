"use client";

import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import type { Check, CheckStatus } from "@/lib/admin/checks";

/**
 * Renderizado común de los diagnósticos del panel.
 *
 * El diagnóstico de MercadoPago y el estado de apertura pintaban la misma
 * tarjeta con el mismo semáforo, cada uno con su copia. Basta con que una se
 * toque para que dejen de parecerse.
 */

export const TONO: Record<
  CheckStatus,
  { icon: typeof CheckCircleIcon; text: string; bg: string; border: string; etiqueta: string }
> = {
  ok: {
    icon: CheckCircleIcon,
    text: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    etiqueta: "Listo",
  },
  warn: {
    icon: ExclamationTriangleIcon,
    text: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
    etiqueta: "Revisar",
  },
  error: {
    icon: XCircleIcon,
    text: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-200",
    etiqueta: "Bloquea",
  },
};

export function CheckRow({ check }: { check: Check }) {
  const tono = TONO[check.status];
  const Icon = tono.icon;

  return (
    <li className={`rounded-lg border ${tono.border} ${tono.bg} p-3`}>
      <div className="flex items-start gap-2.5">
        <Icon className={`h-5 w-5 shrink-0 ${tono.text}`} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-semibold ${tono.text}`}>
            <span className="sr-only">{tono.etiqueta}: </span>
            {check.label}
          </p>
          <p className="mt-0.5 break-words text-sm text-slate-700">{check.detail}</p>
          {check.hint && (
            <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{check.hint}</p>
          )}
        </div>
      </div>
    </li>
  );
}

export function CheckList({ checks }: { checks: Check[] }) {
  return (
    <ul className="space-y-2">
      {checks.map((check) => (
        <CheckRow key={check.id} check={check} />
      ))}
    </ul>
  );
}
