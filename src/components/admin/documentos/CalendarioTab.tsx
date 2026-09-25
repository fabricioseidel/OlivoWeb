"use client";

/**
 * Calendario de pagos: F29, Previred, patente y renta, con el monto que se
 * estima y el que se pagó. Al pagar se anota el monto real y se sube el
 * comprobante, que queda guardado en el bucket privado.
 */

import { useCallback, useEffect, useState } from "react";
import { BanknotesIcon, DocumentCheckIcon } from "@heroicons/react/24/outline";
import { useToast } from "@/contexts/ToastContext";
import { fechaCorta, hoyEnChile, nombrePeriodo } from "@/lib/documentos/vencimientos";
import type { ObligacionConEstado } from "@/server/documentos.service";
import { Cargando } from "./ResumenTab";
import { Boton, Campo, Modal, Plazo, Tarjeta, claseInput, pedir, pesos } from "./ui";

const DONDE_PAGAR: Record<string, string> = {
  F29: "sii.cl → Impuestos mensuales → Declarar IVA (F29)",
  PREVIRED: "previred.com → planilla del mes",
  PATENTE: "Municipalidad de Ñuñoa (Tesorería municipal o pago en línea)",
  F22: "sii.cl → Declaración de renta",
};

export default function CalendarioTab() {
  const { showToast } = useToast();
  const [lista, setLista] = useState<ObligacionConEstado[] | null>(null);
  const [hoy, setHoy] = useState(hoyEnChile());
  const [pagando, setPagando] = useState<ObligacionConEstado | null>(null);
  const [monto, setMonto] = useState("");
  const [fechaPago, setFechaPago] = useState(hoyEnChile());
  const [notas, setNotas] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const r = await pedir<{ hoy: string; obligaciones: ObligacionConEstado[] }>("/api/admin/documentos/calendario");
      setHoy(r.hoy);
      setLista(r.obligaciones);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "No se pudo cargar el calendario", "error");
      setLista([]);
    }
  }, [showToast]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const abrir = (o: ObligacionConEstado) => {
    setPagando(o);
    setMonto(String(o.montoPagado ?? o.montoEstimado ?? ""));
    setFechaPago(o.pagadoEl ?? hoyEnChile());
    setNotas(o.notas ?? "");
    setArchivo(null);
  };

  const guardar = async (desmarcar = false) => {
    if (!pagando) return;
    setGuardando(true);
    const form = new FormData();
    form.append(
      "datos",
      JSON.stringify({
        tipo: pagando.tipo,
        periodo: pagando.periodo,
        vence_el: pagando.vence,
        monto_pagado: desmarcar ? null : Number(monto) || 0,
        pagado_el: desmarcar ? null : fechaPago,
        notas: notas || null,
      }),
    );
    if (archivo && !desmarcar) form.append("file", archivo);
    try {
      await pedir("/api/admin/documentos/calendario", { method: "POST", body: form });
      showToast(desmarcar ? "Pago desmarcado" : "Pago registrado", "success");
      setPagando(null);
      cargar();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "No se pudo guardar", "error");
    } finally {
      setGuardando(false);
    }
  };

  if (!lista) return <Cargando />;

  // Agrupado por mes de vencimiento, que es como se piensa la caja.
  const porMes = lista.reduce<Record<string, ObligacionConEstado[]>>((acc, o) => {
    (acc[o.vence.slice(0, 7)] ??= []).push(o);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {Object.entries(porMes).map(([mes, obligaciones]) => {
        const porPagar = obligaciones.filter((o) => !o.pagadoEl).reduce((s, o) => s + (o.montoEstimado ?? 0), 0);
        return (
          <Tarjeta
            key={mes}
            titulo={<span className="capitalize">Vence en {nombrePeriodo(mes)}</span>}
            accion={porPagar > 0 ? <span className="text-sm font-bold text-gray-800">Por pagar ≈ {pesos(porPagar)}</span> : undefined}
          >
            <ul className="divide-y divide-gray-100">
              {obligaciones.map((o) => (
                <li key={`${o.tipo}-${o.periodo}`} className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900">
                      {o.titulo} <span className="font-semibold text-gray-600 capitalize">· {nombrePeriodo(o.periodo)}</span>
                    </p>
                    <p className="text-xs text-gray-600">
                      Vence el {fechaCorta(o.vence)}
                      {o.pagarAntesDel && !o.pagadoEl && <> · <strong className="text-amber-800">cae en día inhábil: paga a más tardar el {fechaCorta(o.pagarAntesDel)}</strong></>}
                    </p>
                    <p className="text-xs text-gray-500">{DONDE_PAGAR[o.tipo]}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <div className="text-right mr-1">
                      <p className="text-sm font-black text-gray-900">{pesos(o.montoPagado ?? o.montoEstimado)}</p>
                      <p className="text-[11px] text-gray-500">{o.pagadoEl ? `pagado el ${fechaCorta(o.pagadoEl)}` : o.origenEstimacion ?? "sin estimación"}</p>
                    </div>
                    <Plazo hoy={hoy} vence={o.vence} pagado={Boolean(o.pagadoEl)} />
                    {o.tieneComprobante && (
                      <a
                        href={`/api/admin/documentos/calendario/comprobante?tipo=${o.tipo}&periodo=${o.periodo}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-bold text-brand-800 underline"
                      >
                        <DocumentCheckIcon className="h-4 w-4" /> Comprobante
                      </a>
                    )}
                    <Boton variante={o.pagadoEl ? "secundario" : "primario"} onClick={() => abrir(o)} icono={<BanknotesIcon className="h-4 w-4" />}>
                      {o.pagadoEl ? "Editar" : "Registrar pago"}
                    </Boton>
                  </div>
                </li>
              ))}
            </ul>
          </Tarjeta>
        );
      })}

      <Modal abierto={Boolean(pagando)} onCerrar={() => setPagando(null)} titulo="Registrar pago" ancho="max-w-lg">
        {pagando && (
          <div className="space-y-3">
            <p className="text-sm text-gray-700">
              <strong>{pagando.titulo}</strong> de <span className="capitalize">{nombrePeriodo(pagando.periodo)}</span>. Estimado: {pesos(pagando.montoEstimado)}.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Campo etiqueta="Monto pagado" ayuda="El que dice el formulario o la planilla">
                <input value={monto} onChange={(e) => setMonto(e.target.value.replace(/\D/g, ""))} inputMode="numeric" className={claseInput} />
              </Campo>
              <Campo etiqueta="Fecha de pago">
                <input type="date" value={fechaPago} onChange={(e) => setFechaPago(e.target.value)} className={claseInput} />
              </Campo>
            </div>
            <Campo etiqueta="Comprobante (PDF o foto)" ayuda={archivo?.name ?? (pagando.tieneComprobante ? "Ya hay uno guardado; si subes otro, lo reemplaza." : undefined)}>
              <input type="file" accept="image/*,application/pdf" onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} className="block w-full text-sm" />
            </Campo>
            <Campo etiqueta="Notas">
              <input value={notas} onChange={(e) => setNotas(e.target.value)} className={claseInput} placeholder="Ej. folio del F29, N° de operación" />
            </Campo>
            <div className="flex flex-wrap justify-between gap-2 pt-2">
              {pagando.pagadoEl ? <Boton variante="peligro" onClick={() => guardar(true)} disabled={guardando}>Desmarcar pago</Boton> : <span />}
              <div className="flex gap-2">
                <Boton variante="secundario" onClick={() => setPagando(null)}>Cancelar</Boton>
                <Boton onClick={() => guardar()} cargando={guardando} disabled={!monto}>Guardar</Boton>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
