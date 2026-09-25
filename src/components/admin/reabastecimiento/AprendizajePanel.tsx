"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowPathIcon,
  LightBulbIcon,
  ClockIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";

import Button from "@/components/ui/Button";
import { useToast } from "@/contexts/ToastContext";
import type { Regla } from "@/lib/learning-rules";

type Foto = { reglas: Regla[]; listas: number; generadoEn: string };

/**
 * Lo que el historial ya permite afirmar — y lo que todavía no.
 *
 * La decisión de diseño que manda acá: una regla sin datos suficientes NO
 * muestra hallazgos, ni siquiera atenuados. Un número con una advertencia al
 * lado se sigue leyendo como un número, y decidir con dos observaciones es
 * peor que no tener panel. En su lugar muestra cuánto falta y cómo juntarlo.
 */
function ReglaCard({ regla }: { regla: Regla }) {
  const lista = regla.estado === "listo";
  const progreso = Math.min(100, Math.round((regla.observaciones / regla.minimo) * 100));

  return (
    <section
      className={`rounded-2xl p-4 ring-1 ${
        lista ? "bg-white ring-gray-200" : "bg-slate-50/70 ring-slate-200"
      }`}
    >
      <div className="flex flex-wrap items-start gap-3">
        <div
          className={`mt-0.5 rounded-lg p-2 ${
            lista ? "bg-brand-50 text-brand-600" : "bg-slate-200/70 text-slate-500"
          }`}
        >
          {lista ? (
            <LightBulbIcon className="h-5 w-5" />
          ) : (
            <ClockIcon className="h-5 w-5" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-gray-900">{regla.titulo}</h3>
          <p className="mt-0.5 text-xs text-gray-500">{regla.pregunta}</p>

          {!lista && (
            <div className="mt-3">
              <div className="flex items-baseline justify-between text-xs">
                <span className="font-semibold text-slate-700">
                  Faltan {regla.faltan} {regla.faltan === 1 ? "observación" : "observaciones"}
                </span>
                <span className="text-slate-400">
                  {regla.observaciones} de {regla.minimo}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-slate-400 transition-all"
                  style={{ width: `${progreso}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-slate-600">{regla.comoJuntarDatos}</p>
            </div>
          )}
        </div>
      </div>

      {lista && regla.hallazgos.length > 0 && (
        <ul className="mt-3 space-y-2 border-t border-gray-100 pt-3">
          {regla.hallazgos.slice(0, 8).map((h) => (
            <li key={h.sujeto} className="flex flex-wrap items-baseline gap-x-2 text-sm">
              <span className="font-semibold text-gray-900">{h.sujeto}</span>
              <span className="text-gray-600">{h.detalle}</span>
              <span className="text-[10px] text-gray-400">
                ({h.observaciones} {h.observaciones === 1 ? "dato" : "datos"})
              </span>
            </li>
          ))}
          {regla.hallazgos.length > 8 && (
            <li className="text-xs text-gray-400">
              y {regla.hallazgos.length - 8} más
            </li>
          )}
        </ul>
      )}

      {lista && regla.hallazgos.length === 0 && (
        <p className="mt-3 border-t border-gray-100 pt-3 text-sm text-brand-700">
          Hay datos suficientes y no encontró nada que señalar. Buena noticia.
        </p>
      )}

      <details className="mt-3 border-t border-gray-100 pt-2">
        <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-wider text-gray-400 hover:text-gray-600">
          En qué se basa
        </summary>
        <p className="mt-1.5 text-xs leading-relaxed text-gray-500">{regla.base}</p>
      </details>
    </section>
  );
}

export default function AprendizajePanel() {
  const { showToast } = useToast();
  const [foto, setFoto] = useState<Foto | null>(null);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const res = await fetch("/api/admin/aprendizaje", { cache: "no-store" });
      if (!res.ok) throw new Error("No se pudo calcular el aprendizaje");
      setFoto(await res.json());
    } catch (error: any) {
      showToast(error.message || "Error cargando el aprendizaje", "error");
    } finally {
      setCargando(false);
    }
  }, [showToast]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-gray-600">
            Seis preguntas que hoy se responden de memoria, contestadas con el
            historial del propio local.
          </p>
          {foto && (
            <p className="mt-1 text-xs text-gray-400">
              {foto.listas} de {foto.reglas.length} tienen datos suficientes por ahora.
            </p>
          )}
        </div>
        <Button onClick={cargar} disabled={cargando} className="shrink-0">
          <ArrowPathIcon className={`mr-2 h-4 w-4 ${cargando ? "animate-spin" : ""}`} />
          {cargando ? "Calculando…" : "Recalcular"}
        </Button>
      </div>

      {foto && foto.listas === 0 && (
        <div className="flex items-start gap-2 rounded-xl bg-blue-50 p-3 text-xs text-blue-900 ring-1 ring-blue-200">
          <InformationCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
          <span>
            Todavía no hay historial suficiente para ninguna regla, y eso es lo
            esperable: se llena solo a medida que se registran recepciones y se
            acumulan semanas de venta. Estas tarjetas no van a mostrar
            conclusiones hasta tener con qué respaldarlas.
          </span>
        </div>
      )}

      {cargando && !foto && (
        <div className="rounded-2xl bg-white p-8 text-center text-sm text-gray-500 ring-1 ring-gray-200">
          Revisando el historial…
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        {foto?.reglas.map((r) => (
          <ReglaCard key={r.id} regla={r} />
        ))}
      </div>

      {foto && (
        <p className="text-center text-xs text-gray-400">
          Calculado el{" "}
          {new Date(foto.generadoEn).toLocaleString("es-CL", {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </p>
      )}
    </div>
  );
}
