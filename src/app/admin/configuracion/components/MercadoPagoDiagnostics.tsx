"use client";

import { useState } from "react";
import {
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  BeakerIcon,
} from "@heroicons/react/24/outline";

type Check = {
  id: string;
  label: string;
  status: "ok" | "warn" | "error";
  detail: string;
  hint?: string;
};

const TONE = {
  ok: {
    icon: CheckCircleIcon,
    text: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
  },
  warn: {
    icon: ExclamationTriangleIcon,
    text: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
  },
  error: {
    icon: XCircleIcon,
    text: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-200",
  },
} as const;

/**
 * Panel que verifica la integración con MercadoPago contra la API real.
 * Existe porque los fallos de cobro casi nunca son del código: token de
 * prueba, secret de webhook faltante o intentar pagarse a uno mismo. Sin este
 * panel esos casos solo se ven en los logs de Vercel.
 */
export default function MercadoPagoDiagnostics() {
  const [checks, setChecks] = useState<Check[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/mercadopago/diagnostico", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo ejecutar el diagnóstico");
      setChecks(data.checks || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border-t border-slate-200 pt-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <BeakerIcon className="h-4 w-4 text-slate-400" />
            Diagnóstico de MercadoPago
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Revisa el token, la cuenta que recibe el dinero y el webhook.
          </p>
        </div>
        <button
          type="button"
          onClick={run}
          disabled={loading}
          className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
        >
          {loading ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : null}
          {loading ? "Verificando…" : "Verificar"}
        </button>
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      {checks && (
        <ul className="mt-4 space-y-2">
          {checks.map((c) => {
            const tone = TONE[c.status];
            const Icon = tone.icon;
            return (
              <li
                key={c.id}
                className={`rounded-lg border ${tone.border} ${tone.bg} px-4 py-3`}
              >
                <div className="flex items-start gap-3">
                  <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${tone.text}`} />
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold ${tone.text}`}>{c.label}</p>
                    <p className="mt-0.5 break-words text-sm text-slate-600">{c.detail}</p>
                    {c.hint && (
                      <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{c.hint}</p>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
