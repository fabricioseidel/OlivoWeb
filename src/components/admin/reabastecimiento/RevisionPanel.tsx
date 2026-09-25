"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChatBubbleLeftRightIcon,
  GlobeAltIcon,
  PrinterIcon,
  PhoneIcon,
  ArrowPathIcon,
  ClipboardDocumentIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

import Button from "@/components/ui/Button";
import { useToast } from "@/contexts/ToastContext";
import { formatCLP } from "@/utils/currency";
import { aBruto } from "@/lib/pricing";
import { CHANNEL_LABEL, type SupplierOrderChannel } from "@/lib/admin/statusMap";
// El texto que se previsualiza es EXACTAMENTE el que arma el servidor al
// mandar el pedido: la misma función, no una copia que se pueda desviar.
import { generarMensajeCompra } from "@/lib/purchase-message";

const CLP = formatCLP;

/**
 * Revisión del pedido antes de mandarlo.
 *
 * Antes el pedido salía tal como lo generó el motor de reposición y lo
 * siguiente que se sabía de él era que había llegado. Este panel mete el paso
 * que faltaba: mirar las cantidades, ajustar lo que haga falta, y recién
 * entonces elegir por dónde sale.
 *
 * Los cuatro canales no son cuatro botones que hacen lo mismo. Cambian el texto
 * que se genera: al proveedor le llega el pedido con precios —que es la
 * referencia contra la que confirma— y quien va al local se lleva una guía con
 * casillas para marcar y espacio para anotar el precio pagado, que es el dato
 * que después detecta la variación de costo.
 */

type Linea = {
  id: string;
  productName: string;
  sku: string | null;
  quantity: number;
  unitCost: number | null;
  taxRate: number;
};

type Pedido = {
  id: string;
  supplierName: string;
  supplierWhatsapp?: string | null;
  supplierPhone?: string | null;
  expectedDate?: string | null;
  notes?: string | null;
  status: string;
  channel?: SupplierOrderChannel | null;
  items: Linea[];
};

const CANALES: {
  id: SupplierOrderChannel;
  icono: typeof ChatBubbleLeftRightIcon;
  explica: string;
}[] = [
  {
    id: "whatsapp",
    icono: ChatBubbleLeftRightIcon,
    explica: "Abre WhatsApp con el pedido escrito y precios para que confirme.",
  },
  {
    id: "online",
    icono: GlobeAltIcon,
    explica: "Copia el pedido para pegarlo en la web del proveedor.",
  },
  {
    id: "presencial",
    icono: PrinterIcon,
    explica: "Imprime una guía con casillas para marcar y anotar el precio pagado.",
  },
  {
    id: "telefono",
    icono: PhoneIcon,
    explica: "Muestra el pedido para leerlo por teléfono.",
  },
];

export default function RevisionPanel({
  orderId,
  onEnviado,
}: {
  orderId: string;
  onEnviado?: () => void;
}) {
  const { showToast } = useToast();
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [cargando, setCargando] = useState(true);
  const [canal, setCanal] = useState<SupplierOrderChannel>("whatsapp");
  const [cantidades, setCantidades] = useState<Record<string, number>>({});
  const [enviando, setEnviando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const res = await fetch(`/api/admin/supplier-orders/${orderId}`, { cache: "no-store" });
      if (!res.ok) throw new Error("No se pudo cargar el pedido");
      const data = await res.json();

      const normalizado: Pedido = {
        id: data.id,
        supplierName: data.supplier_name,
        supplierWhatsapp: data.supplier_whatsapp,
        supplierPhone: data.supplier_phone,
        expectedDate: data.expected_date,
        notes: data.notes,
        status: data.status,
        channel: data.channel,
        items: (data.items ?? []).map((it: any) => ({
          id: it.id,
          productName: it.product_name,
          sku: it.product_sku ?? it.supplier_sku ?? null,
          quantity: Number(it.quantity) || 0,
          unitCost: it.unit_cost === null || it.unit_cost === undefined ? null : Number(it.unit_cost),
          taxRate: Number(it.tax_rate) || 19,
        })),
      };

      setPedido(normalizado);
      setCantidades(
        Object.fromEntries(normalizado.items.map((it) => [it.id, it.quantity]))
      );
      if (normalizado.channel) setCanal(normalizado.channel);
    } catch (error: any) {
      showToast(error.message || "Error cargando el pedido", "error");
    } finally {
      setCargando(false);
    }
  }, [orderId, showToast]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const texto = useMemo(() => {
    if (!pedido) return "";
    return generarMensajeCompra(
      canal,
      {
        id: pedido.id,
        proveedor: pedido.supplierName,
        fechaEsperada: pedido.expectedDate,
        notas: pedido.notes,
      },
      pedido.items.map((it) => ({
        nombre: it.productName,
        sku: it.sku,
        cantidad: cantidades[it.id] ?? it.quantity,
        costoNeto: it.unitCost,
        tasa: it.taxRate,
      }))
    );
  }, [canal, pedido, cantidades]);

  const totalEstimado = useMemo(() => {
    if (!pedido) return 0;
    return pedido.items.reduce((s, it) => {
      const cantidad = cantidades[it.id] ?? it.quantity;
      const bruto = it.unitCost === null ? 0 : (aBruto(it.unitCost, it.taxRate) ?? 0);
      return s + bruto * cantidad;
    }, 0);
  }, [pedido, cantidades]);

  const sinCosto = useMemo(
    () => (pedido?.items ?? []).filter((it) => it.unitCost === null).length,
    [pedido]
  );

  const yaCerrado = pedido !== null && ["recibido", "cancelado"].includes(pedido.status);

  const marcarEnviado = useCallback(async () => {
    setEnviando(true);
    try {
      const res = await fetch(`/api/admin/supplier-orders/${orderId}/ciclo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion: "enviar", canal }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo marcar como enviado");
      showToast(`Pedido marcado como enviado por ${CHANNEL_LABEL[canal]}`, "success");
      await cargar();
      onEnviado?.();
    } catch (error: any) {
      showToast(error.message || "Error marcando el envío", "error");
    } finally {
      setEnviando(false);
    }
  }, [canal, orderId, cargar, onEnviado, showToast]);

  const salir = useCallback(async () => {
    if (!pedido) return;

    if (canal === "whatsapp") {
      const telefono = (pedido.supplierWhatsapp || pedido.supplierPhone || "").replace(/\D/g, "");
      if (!telefono) {
        showToast("Este proveedor no tiene WhatsApp cargado", "error");
        return;
      }
      window.open(`https://wa.me/${telefono}?text=${encodeURIComponent(texto)}`, "_blank");
    } else if (canal === "presencial") {
      window.print();
    } else {
      try {
        await navigator.clipboard.writeText(texto);
        showToast("Pedido copiado al portapapeles", "success");
      } catch {
        // Sin permiso de portapapeles el texto sigue visible y seleccionable:
        // no tiene sentido bloquear el envío por eso.
        showToast("No se pudo copiar; seleccioná el texto a mano", "warning");
      }
    }

    await marcarEnviado();
  }, [canal, pedido, texto, marcarEnviado, showToast]);

  if (cargando) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center text-sm text-gray-500 ring-1 ring-gray-200">
        Cargando el pedido…
      </div>
    );
  }

  if (!pedido) return null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-bold text-gray-900">
            Revisión del pedido #{pedido.id.slice(0, 8)}
          </div>
          <div className="text-xs text-gray-500">
            {pedido.supplierName} · {pedido.items.length}{" "}
            {pedido.items.length === 1 ? "producto" : "productos"} ·{" "}
            <span className="font-semibold">{CLP(totalEstimado)}</span> con IVA
          </div>
        </div>
        <Button onClick={cargar} disabled={cargando} className="shrink-0">
          <ArrowPathIcon className="mr-2 h-4 w-4" />
          Recargar
        </Button>
      </div>

      {sinCosto > 0 && (
        <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-900 ring-1 ring-amber-200">
          <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <span>
            {sinCosto} {sinCosto === 1 ? "producto no tiene" : "productos no tienen"} costo
            cargado. El total estimado se queda corto y el pedido sale sin precio de
            referencia para esas líneas.
          </span>
        </div>
      )}

      <div className="rounded-2xl bg-white ring-1 ring-gray-200">
        <div className="border-b border-gray-100 px-4 py-3 text-xs font-bold uppercase tracking-widest text-gray-400">
          Cantidades
        </div>
        <div className="divide-y divide-gray-100">
          {pedido.items.map((it) => {
            const cantidad = cantidades[it.id] ?? it.quantity;
            const bruto = it.unitCost === null ? null : aBruto(it.unitCost, it.taxRate);
            return (
              <div key={it.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-gray-900">
                    {it.productName}
                  </div>
                  <div className="text-[11px] text-gray-400">
                    {it.sku && <span className="font-mono">{it.sku}</span>}
                    {bruto !== null && <span> · {CLP(bruto)} c/u con IVA</span>}
                    {bruto === null && <span className="text-amber-600"> · sin costo</span>}
                  </div>
                </div>
                <input
                  type="number"
                  min={0}
                  value={cantidad}
                  onChange={(e) =>
                    setCantidades((prev) => ({
                      ...prev,
                      [it.id]: Math.max(0, Number(e.target.value) || 0),
                    }))
                  }
                  className="w-20 rounded-lg border border-gray-300 px-2 py-1 text-right text-sm font-semibold text-gray-900 focus:border-brand-500 focus:ring-brand-500"
                />
                <div className="w-24 text-right text-sm font-semibold text-gray-700">
                  {bruto !== null ? CLP(bruto * cantidad) : "—"}
                </div>
              </div>
            );
          })}
        </div>
        <div className="border-t border-gray-100 px-4 py-2 text-[11px] text-gray-400">
          Ajustar acá cambia sólo el texto que sale. Lo que quede guardado en el
          pedido se registra al recibir, con lo que realmente llegue.
        </div>
      </div>

      <div>
        <div className="mb-2 text-xs font-bold uppercase tracking-widest text-gray-400">
          ¿Por dónde sale?
        </div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {CANALES.map((c) => {
            const Icono = c.icono;
            const activo = canal === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setCanal(c.id)}
                title={c.explica}
                className={`flex flex-col items-center gap-1.5 rounded-xl px-3 py-3 text-xs font-bold transition-colors ${
                  activo
                    ? "bg-gray-900 text-white"
                    : "bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50"
                }`}
              >
                <Icono className="h-5 w-5" />
                {CHANNEL_LABEL[c.id]}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-gray-500">
          {CANALES.find((c) => c.id === canal)?.explica}
        </p>
      </div>

      {/* `window.print()` imprime la página entera, así que la guía salía con la
          navegación del admin alrededor y partida en varias hojas. Esta hoja de
          estilo deja en el papel sólo el texto del pedido. */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #guia-de-compra, #guia-de-compra * { visibility: visible !important; }
          #guia-de-compra {
            position: absolute; left: 0; top: 0; width: 100%;
            max-height: none; overflow: visible;
            font-size: 12pt; color: #000;
          }
        }
      `}</style>

      <div className="rounded-2xl bg-white ring-1 ring-gray-200">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <span className="text-xs font-bold uppercase tracking-widest text-gray-400">
            Lo que va a salir
          </span>
          <button
            type="button"
            onClick={() => navigator.clipboard?.writeText(texto)}
            className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-gray-900"
          >
            <ClipboardDocumentIcon className="h-4 w-4" />
            Copiar
          </button>
        </div>
        <pre
          id="guia-de-compra"
          className="max-h-72 overflow-auto whitespace-pre-wrap break-words px-4 py-3 font-mono text-xs leading-relaxed text-gray-700"
        >
          {texto}
        </pre>
      </div>

      {yaCerrado ? (
        <p className="rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-600 ring-1 ring-slate-200">
          Este pedido ya está {pedido.status}. Se puede volver a abrir el texto,
          pero el canal por el que se compró no se cambia.
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={salir}
            disabled={enviando}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
          >
            {canal === "whatsapp" && <ChatBubbleLeftRightIcon className="h-4 w-4" />}
            {canal === "presencial" && <PrinterIcon className="h-4 w-4" />}
            {canal === "online" && <GlobeAltIcon className="h-4 w-4" />}
            {canal === "telefono" && <PhoneIcon className="h-4 w-4" />}
            {enviando ? "Marcando…" : `Enviar por ${CHANNEL_LABEL[canal]}`}
          </button>
          <button
            type="button"
            onClick={marcarEnviado}
            disabled={enviando}
            className="rounded-xl px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-gray-500 transition-colors hover:bg-gray-100 disabled:opacity-50"
            title="Marca el canal sin abrir nada: para cuando ya lo mandaste por fuera"
          >
            Ya lo mandé
          </button>
          {pedido.channel && (
            <span className="text-xs text-gray-400">
              Última salida: {CHANNEL_LABEL[pedido.channel]}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
