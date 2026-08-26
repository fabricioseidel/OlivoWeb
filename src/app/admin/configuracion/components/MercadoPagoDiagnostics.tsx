"use client";

import { useState } from "react";
import { ArrowPathIcon, BeakerIcon } from "@heroicons/react/24/outline";
import { CheckList } from "@/components/admin/CheckList";
import type { Check } from "@/lib/admin/checks";

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
        <div className="mt-4">
          <CheckList checks={checks} />
        </div>
      )}
    </div>
  );
}
