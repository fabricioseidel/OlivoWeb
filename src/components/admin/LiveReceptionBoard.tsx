"use client";

/**
 * El tablero con el que la tienda atiende los pedidos.
 *
 * Rehecho siguiendo el panel de Uber Eats, que es el que la tienda ya sabe
 * usar: pestañas con el número al lado, una lista sola por vez y un botón
 * grande por pedido. Antes eran tres columnas simultáneas: en el teléfono
 * —que es donde se atiende— quedaban una debajo de otra y había que
 * desplazarse para saber si había algo nuevo.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ClockIcon,
  BellAlertIcon,
  BellSlashIcon,
  ArrowPathIcon,
  TruckIcon,
} from "@heroicons/react/24/outline";
import {
  agruparPorEtapa,
  esperandoPago,
  esperaEnTexto,
  estaAtrasado,
  type Etapa,
} from "@/lib/admin/pedidos-nuevos";
import { leerEstadoUber } from "@/lib/uber-status";

export interface LiveOrder {
  id: string;
  total?: number;
  productos?: number;
  createdAt?: string;
  estado?: string;
  customer?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  shippingMethod?: string;
  expressStatus?: string | null;
  expressTrackingUrl?: string | null;
  expressError?: string | null;
  items?: any[];
}

interface LiveReceptionBoardProps {
  orders: LiveOrder[];
  onUpdateStatus: (id: string, newStatus: string) => void;
  /** Vuelve a pedirle el repartidor a Uber. */
  onReintentarEntrega?: (id: string) => Promise<void> | void;
  /** Estado de la campanilla, para el interruptor del encabezado. */
  alertaActivada?: boolean;
  onAlternarAlerta?: () => void;
  onRefrescar?: () => void;
  /** Hora del último refresco, sólo informativa. */
  ultimoSync?: string;
}

/** Qué hace el botón grande de cada etapa. */
const ACCION: Record<Etapa, { texto: string; siguiente: string }> = {
  preparar: { texto: "Marcar como listo", siguiente: "shipped" },
  listos: { texto: "Marcar entregado", siguiente: "delivered" },
};

const VACIO: Record<Etapa, string> = {
  preparar: "No hay pedidos por preparar",
  listos: "No hay pedidos listos",
};

const TITULO: Record<Etapa, string> = {
  preparar: "Por preparar",
  listos: "Listos",
};

/** Cómo se despacha, en una palabra. */
function etiquetaEnvio(metodo?: string): string | null {
  switch (String(metodo ?? "").toLowerCase()) {
    case "flash":
      return "Envío flash";
    case "pickup":
    case "retiro":
      return "Retiro en tienda";
    case "delivery":
    case "scheduled":
    case "agendado":
      return "Envío agendado";
    default:
      return metodo ? String(metodo) : null;
  }
}

/**
 * El error de Uber, en algo que se pueda accionar.
 *
 * Los códigos vienen en inglés y en jerga de la API. `authorization_hold`, que
 * es el que apareció en producción, significa que Uber no pudo retener el
 * cobro de la tarifa en la cuenta de la tienda — o sea que se arregla en la
 * facturación de Uber, no acá.
 */
function motivoLegible(crudo: string): string {
  const t = crudo.toLowerCase();
  if (t.includes("authorization_hold")) {
    return "Uber no pudo retener el cobro de la tarifa: revisa el método de pago de tu cuenta de Uber Direct.";
  }
  if (t.includes("address_undeliverable") || t.includes("no está llegando")) {
    return "Uber no está llegando a esa dirección en este momento.";
  }
  if (t.includes("expired") || t.includes("quote")) {
    return "La cotización de Uber venció. Reintentar pide una nueva.";
  }
  if (t.includes("customer") && t.includes("token")) {
    return "Las credenciales de Uber Direct no son válidas: revísalas en Vercel.";
  }
  return crudo;
}

function TarjetaPedido({
  order,
  etapa,
  onUpdateStatus,
  onReintentarEntrega,
}: {
  order: LiveOrder;
  etapa: Etapa;
  onUpdateStatus: (id: string, nuevo: string) => void;
  onReintentarEntrega?: (id: string) => Promise<void> | void;
}) {
  const [reintentando, setReintentando] = useState(false);
  const atrasado = etapa === "preparar" && estaAtrasado(order.createdAt);
  const envio = etiquetaEnvio(order.shippingMethod);
  const esFlash = String(order.shippingMethod ?? "").toLowerCase() === "flash";
  const accion = ACCION[etapa];

  return (
    <div
      className={`bg-white rounded-2xl border ${
        atrasado ? "border-red-300 ring-1 ring-red-200" : "border-gray-200"
      } p-4 sm:p-5`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 truncate">
            {order.customer || "Invitado"}
          </h3>
          <p className="text-sm text-gray-500 mt-0.5">
            #{order.id.substring(0, 6)} · {order.productos ?? 0}{" "}
            {order.productos === 1 ? "producto" : "productos"}
          </p>
        </div>
        <div
          className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm font-medium ${
            atrasado ? "bg-red-50 text-red-700" : "bg-gray-100 text-gray-700"
          }`}
        >
          <ClockIcon className="w-4 h-4" />
          {esperaEnTexto(order.createdAt)}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="text-2xl font-semibold text-gray-900">
          ${Number(order.total || 0).toLocaleString("es-CL")}
        </span>
        {envio && (
          <span className="text-sm text-gray-500 border border-gray-200 rounded-lg px-2 py-0.5">
            {envio}
          </span>
        )}
      </div>

      {/* En el flash el repartidor lo maneja Uber: lo que la tienda necesita
          saber es si ya viene en camino, sin salir del tablero. */}
      {esFlash && order.expressStatus && order.expressStatus !== "failed" && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-blue-800">{leerEstadoUber(order.expressStatus).etiqueta}</span>
          {order.expressTrackingUrl && (
            <a
              href={order.expressTrackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-blue-700 font-medium underline underline-offset-2"
            >
              <TruckIcon className="w-4 h-4" />
              Ver repartidor
            </a>
          )}
        </div>
      )}

      {/* El motivo, no sólo el fallo. Antes decía "Uber no tomó la entrega" y
          la razón quedaba enterrada en la auditoría: la primera vez que pasó
          —Uber no pudo retener el cobro de la tarifa— costó una investigación
          entera para leer una línea que ya estaba guardada. */}
      {esFlash && order.expressStatus === "failed" && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-sm font-medium text-red-800">Uber no tomó la entrega</p>
          {order.expressError && (
            <p className="mt-1 text-sm text-red-700 break-words">
              {motivoLegible(order.expressError)}
            </p>
          )}
          {onReintentarEntrega && (
            <button
              onClick={async () => {
                setReintentando(true);
                try {
                  await onReintentarEntrega(order.id);
                } finally {
                  setReintentando(false);
                }
              }}
              disabled={reintentando}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-red-700 px-3 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-60"
            >
              <ArrowPathIcon className={`w-4 h-4 ${reintentando ? "animate-spin" : ""}`} />
              {reintentando ? "Pidiendo repartidor…" : "Reintentar entrega"}
            </button>
          )}
        </div>
      )}

      <div className="mt-4 flex items-center gap-2">
        <Link
          href={`/admin/pedidos/${order.id}`}
          className="px-4 py-3 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 min-h-[48px] flex items-center"
        >
          Ver
        </Link>
        <button
          onClick={() => onUpdateStatus(order.id, accion.siguiente)}
          className="flex-1 px-4 py-3 rounded-xl bg-gray-900 text-white font-semibold hover:bg-black active:scale-[0.99] transition min-h-[48px]"
        >
          {accion.texto}
        </button>
      </div>
    </div>
  );
}

export default function LiveReceptionBoard({
  orders,
  onUpdateStatus,
  onReintentarEntrega,
  alertaActivada,
  onAlternarAlerta,
  onRefrescar,
  ultimoSync,
}: LiveReceptionBoardProps) {
  const [etapa, setEtapa] = useState<Etapa>("preparar");
  const grupos = useMemo(() => agruparPorEtapa(orders), [orders]);
  const sinPagar = useMemo(() => esperandoPago(orders), [orders]);
  const lista = grupos[etapa];

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {/* Barra superior: el estado de la alerta se ve sin buscarlo, porque una
          alerta apagada que nadie nota es peor que no tenerla. */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-200 flex-wrap">
        <button
          onClick={onAlternarAlerta}
          className={`inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-semibold min-h-[44px] transition ${
            alertaActivada
              ? "bg-green-50 text-green-800 ring-1 ring-green-200"
              : "bg-amber-50 text-amber-900 ring-1 ring-amber-300"
          }`}
        >
          {alertaActivada ? (
            <BellAlertIcon className="w-5 h-5" />
          ) : (
            <BellSlashIcon className="w-5 h-5" />
          )}
          {alertaActivada ? "Alerta activada" : "Activar alerta sonora"}
        </button>

        <div className="flex items-center gap-3">
          {ultimoSync && <span className="text-sm text-gray-400">Actualizado {ultimoSync}</span>}
          <button
            onClick={onRefrescar}
            aria-label="Actualizar pedidos"
            className="p-2.5 rounded-full hover:bg-gray-100 text-gray-500 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <ArrowPathIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Pestañas con el número al lado, como el panel de Uber Eats. */}
      <div className="flex border-b border-gray-200">
        {(Object.keys(TITULO) as Etapa[]).map((k) => {
          const activa = k === etapa;
          const cantidad = grupos[k].length;
          return (
            <button
              key={k}
              onClick={() => setEtapa(k)}
              aria-current={activa ? "page" : undefined}
              className={`flex-1 flex items-center justify-center gap-2 px-2 py-4 text-base font-medium border-b-2 -mb-px transition ${
                activa
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <span className="truncate">{TITULO[k]}</span>
              <span
                className={`min-w-[28px] px-1.5 py-0.5 rounded-md border text-sm ${
                  // Lo que está por preparar se marca: es la columna en la que
                  // un descuido se nota tarde.
                  k === "preparar" && cantidad > 0
                    ? "border-red-200 bg-red-50 text-red-700 font-semibold"
                    : "border-gray-200 text-gray-600"
                }`}
              >
                {cantidad}
              </span>
            </button>
          );
        })}
      </div>

      <div className="p-4 space-y-3 bg-gray-50 min-h-[220px]">
        {lista.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white px-5 py-8 text-gray-500">
            {VACIO[etapa]}
          </div>
        ) : (
          lista.map((order) => (
            <TarjetaPedido
              key={order.id}
              order={order}
              etapa={etapa}
              onUpdateStatus={onUpdateStatus}
              onReintentarEntrega={onReintentarEntrega}
            />
          ))
        )}

        {/* Los que quedaron esperando el pago no son trabajo, así que no
            ocupan pestaña ni suenan. Pero se cuentan: un abandono suelto es
            normal, y muchos acumulándose son el síntoma de que las
            confirmaciones de pago dejaron de llegar. */}
        {sinPagar.length > 0 && (
          <p className="pt-1 text-sm text-gray-500">
            {sinPagar.length === 1
              ? "1 pedido quedó esperando el pago."
              : `${sinPagar.length} pedidos quedaron esperando el pago.`}{" "}
            <Link href="/admin/pedidos" className="underline underline-offset-2 hover:text-gray-700">
              Verlos
            </Link>
            {sinPagar.length >= 5 && (
              <span className="text-amber-700">
                {" "}— si se siguen acumulando, revisa que las confirmaciones de pago estén llegando.
              </span>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
