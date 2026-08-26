"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowPathIcon, RocketLaunchIcon } from "@heroicons/react/24/outline";
import { CheckList, TONO } from "@/components/admin/CheckList";
import type { CheckGroup, CheckStatus } from "@/lib/admin/checks";

type Estado = {
  generadoEn: string;
  estado: CheckStatus;
  bloqueantes: number;
  advertencias: number;
  grupos: CheckGroup[];
};

/**
 * Estado de apertura.
 *
 * `TODO-HUMANO.md` dice qué falta para abrir; esta pantalla responde cuáles de
 * esos puntos están resueltos AHORA, que es lo que cambia cada día. Comprueba
 * de verdad la base, las variables del despliegue, el catálogo y el inventario
 * en vez de pedir que se revisen cinco sitios a mano.
 */
export default function AperturaPage() {
  const [estado, setEstado] = useState<Estado | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/estado-apertura", { cache: "no-store" });
      if (!res.ok) throw new Error(`El servidor respondió ${res.status}`);
      setEstado(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const tono = estado ? TONO[estado.estado] : TONO.warn;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <RocketLaunchIcon className="h-6 w-6 text-emerald-600" />
            Estado de apertura
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Qué falta para que la tienda pueda vender de verdad.
          </p>
        </div>
        <button
          type="button"
          onClick={cargar}
          disabled={cargando}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
        >
          <ArrowPathIcon className={`h-4 w-4 ${cargando ? "animate-spin" : ""}`} />
          {cargando ? "Comprobando…" : "Volver a comprobar"}
        </button>
      </header>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          No se pudo comprobar el estado: {error}
        </div>
      )}

      {estado && (
        <>
          <div className={`rounded-xl border ${tono.border} ${tono.bg} p-4`}>
            <p className={`text-sm font-semibold ${tono.text}`}>
              {estado.bloqueantes > 0
                ? `${estado.bloqueantes} ${estado.bloqueantes === 1 ? "punto bloquea" : "puntos bloquean"} la apertura`
                : estado.advertencias > 0
                  ? `Nada bloquea la apertura, pero hay ${estado.advertencias} ${estado.advertencias === 1 ? "punto" : "puntos"} que revisar`
                  : "Todo comprobado y en orden"}
            </p>
            <p className="mt-1 text-xs text-slate-600">
              Esta pantalla comprueba lo que se puede verificar solo. La prueba
              de compra real —pagar, recibir el correo y ver el pedido marcado
              como pagado— sigue siendo manual y es la única que confirma que la
              cadena entera funciona.
            </p>
          </div>

          {estado.grupos.map((grupo) => (
            <section key={grupo.titulo} className="rounded-xl border border-slate-200 bg-white p-4">
              <h2 className="text-base font-semibold text-slate-900">{grupo.titulo}</h2>
              {grupo.descripcion && (
                <p className="mb-3 mt-0.5 text-xs text-slate-500">{grupo.descripcion}</p>
              )}
              <div className={grupo.descripcion ? "" : "mt-3"}>
                <CheckList checks={grupo.checks} />
              </div>
            </section>
          ))}

          <p className="text-center text-xs text-slate-400">
            Comprobado el{" "}
            {new Date(estado.generadoEn).toLocaleString("es-CL", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
        </>
      )}
    </div>
  );
}
