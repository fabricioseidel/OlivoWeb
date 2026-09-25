"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BanknotesIcon,
  BellAlertIcon,
  CalendarDaysIcon,
  DocumentMagnifyingGlassIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { StatsCard, StatsRow } from "@/components/admin/shell";
import { diasEntre, fechaCorta, nombrePeriodo, periodoSiguiente } from "@/lib/documentos/vencimientos";
import type { Alerta, LibroMensual, ObligacionConEstado } from "@/server/documentos.service";
import { Boton, Plazo, Tarjeta, pedir, pesos } from "./ui";

type Panel = {
  hoy: string;
  periodoActual: string;
  periodoAnterior: string;
  proximas: ObligacionConEstado[];
  libroActual: LibroMensual;
  libroAnterior: LibroMensual;
  pendientesRevision: number;
  porPagar: { cantidad: number; total: number; vencidas: number };
  alertas: Alerta[];
};

const iconoAlerta = {
  rojo: { Icono: XCircleIcon, clase: "bg-rose-50 ring-rose-200 text-rose-900", icono: "text-rose-600" },
  ambar: { Icono: ExclamationTriangleIcon, clase: "bg-amber-50 ring-amber-200 text-amber-950", icono: "text-amber-600" },
  info: { Icono: InformationCircleIcon, clase: "bg-sky-50 ring-sky-200 text-sky-950", icono: "text-sky-600" },
};

export default function ResumenTab({ irA }: { irA: (tab: string) => void }) {
  const [datos, setDatos] = useState<Panel | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      setDatos(await pedir<Panel>("/api/admin/documentos/panel"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar el resumen");
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (error) {
    return (
      <Tarjeta>
        <p className="text-sm text-rose-700 font-semibold">{error}</p>
        <Boton variante="secundario" className="mt-3" onClick={cargar}>Reintentar</Boton>
      </Tarjeta>
    );
  }
  if (!datos) return <Cargando />;

  const pendientes = datos.proximas.filter((o) => !o.pagadoEl);
  const siguiente = pendientes[0];
  const separar30 = pendientes
    .filter((o) => diasEntre(datos.hoy, o.vence) <= 30)
    .reduce((s, o) => s + (o.montoEstimado ?? 0), 0);
  const previred = pendientes.find((o) => o.tipo === "PREVIRED");
  const libro = datos.libroActual;

  return (
    <div className="space-y-5">
      {siguiente && (
        <section className="rounded-3xl bg-gradient-to-br from-brand-50 to-white ring-1 ring-brand-200 p-5 sm:p-6">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-brand-800">Lo próximo que vence</p>
              <h2 className="mt-1 text-xl sm:text-2xl font-black text-gray-900">
                {siguiente.titulo} <span className="font-semibold text-gray-600">· {nombrePeriodo(siguiente.periodo)}</span>
              </h2>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-700">
                <Plazo hoy={datos.hoy} vence={siguiente.vence} />
                <span>vence el {fechaCorta(siguiente.vence)}</span>
                {siguiente.pagarAntesDel && (
                  <span className="font-semibold text-amber-800">
                    · no es día hábil: págalo a más tardar el {fechaCorta(siguiente.pagarAntesDel)}
                  </span>
                )}
              </div>
            </div>
            <div className="md:text-right">
              <p className="text-3xl sm:text-4xl font-black text-gray-900">{pesos(siguiente.montoEstimado)}</p>
              <p className="text-xs text-gray-600">{siguiente.origenEstimacion ?? "Sin estimación: faltan datos"}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Boton onClick={() => irA("calendario")} icono={<BanknotesIcon className="h-4 w-4" />}>
              Registrar el pago
            </Boton>
            <Boton variante="secundario" onClick={() => irA(siguiente.tipo === "PREVIRED" ? "imposiciones" : "libro")}>
              Ver el detalle
            </Boton>
          </div>
        </section>
      )}

      <StatsRow>
        <StatsCard
          label={`Plata a separar (30 días)`}
          value={pesos(separar30)}
          hint="Suma de lo que vence en el próximo mes"
          tone="brand"
          icon={<BanknotesIcon className="h-4 w-4" />}
        />
        <StatsCard
          label={`IVA + PPM de ${nombrePeriodo(datos.periodoActual)}`}
          value={pesos(libro.estimado.totalF29)}
          hint={`Estimado a hoy · se paga en ${nombrePeriodo(periodoSiguiente(datos.periodoActual))}`}
          tone="indigo"
          icon={<CalendarDaysIcon className="h-4 w-4" />}
        />
        <StatsCard
          label="Imposiciones del mes"
          value={previred?.montoEstimado != null ? pesos(previred.montoEstimado) : "Sin datos"}
          hint={previred?.montoEstimado != null ? `Previred · vence el ${fechaCorta(previred.vence)}` : "Carga a tus trabajadores para estimarlo"}
          tone="sky"
          icon={<BanknotesIcon className="h-4 w-4" />}
        />
        <StatsCard
          label="Facturas por revisar"
          value={String(datos.pendientesRevision)}
          hint={datos.porPagar.cantidad ? `${datos.porPagar.cantidad} por pagar · ${pesos(datos.porPagar.total)}` : "Nada pendiente de pago"}
          tone={datos.pendientesRevision ? "amber" : "default"}
          icon={<DocumentMagnifyingGlassIcon className="h-4 w-4" />}
        />
      </StatsRow>

      <Tarjeta titulo={<span className="inline-flex items-center gap-2"><BellAlertIcon className="h-4 w-4" /> Avisos</span>}>
        {datos.alertas.length === 0 ? (
          <p className="text-sm text-gray-600">Todo en orden: no hay pagos atrasados ni documentos esperando.</p>
        ) : (
          <ul className="space-y-2">
            {datos.alertas.map((a, i) => {
              const { Icono, clase, icono } = iconoAlerta[a.nivel];
              return (
                <li key={i} className={`flex items-start gap-3 rounded-xl ring-1 p-3 ${clase}`}>
                  <Icono className={`h-5 w-5 shrink-0 mt-0.5 ${icono}`} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold">{a.titulo}</p>
                    <p className="text-sm opacity-90">{a.detalle}</p>
                  </div>
                  {a.tab && (
                    <button type="button" onClick={() => irA(a.tab!)} className="text-xs font-bold underline shrink-0">
                      Ir
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Tarjeta>

      <Tarjeta
        titulo="Próximos vencimientos"
        accion={<Boton variante="suave" onClick={() => irA("calendario")}>Ver calendario</Boton>}
      >
        <ul className="divide-y divide-gray-100">
          {datos.proximas.map((o) => (
            <li key={`${o.tipo}-${o.periodo}`} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900">{o.titulo}</p>
                <p className="text-xs text-gray-600 capitalize">
                  {nombrePeriodo(o.periodo)} · vence el {fechaCorta(o.vence)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-gray-900">{pesos(o.montoPagado ?? o.montoEstimado)}</span>
                <Plazo hoy={datos.hoy} vence={o.vence} pagado={Boolean(o.pagadoEl)} />
              </div>
            </li>
          ))}
        </ul>
      </Tarjeta>

      <p className="text-xs text-gray-500">
        Los montos son estimaciones para planificar la caja. Lo que se paga es lo que calcula el formulario del SII
        (F29) o la planilla de Previred: anótalo al pagar para que quede registrado junto al comprobante.
      </p>
    </div>
  );
}

export function Cargando() {
  return (
    <div className="flex items-center justify-center py-16" role="status" aria-label="Cargando">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-brand-200 border-t-brand-700" />
    </div>
  );
}
