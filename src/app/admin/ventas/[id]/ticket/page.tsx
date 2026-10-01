"use client";

/**
 * Ticket de una venta del POS para impresora térmica de 80 mm.
 *
 * Se abre en una pestaña nueva desde el detalle de la venta y lanza la
 * impresión sola. Al imprimir sólo sale el ticket: el menú del panel queda
 * oculto. No es una boleta del SII (esa se emite en Gestión documental), y
 * el ticket lo dice para que el cliente no lo confunda.
 */

import { use, useEffect, useState } from "react";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { paymentLabel } from "@/lib/pos/payments";

type Item = { product_name: string | null; product_barcode: string; quantity: number; unit_price: number; subtotal: number };
type Pago = { method: string; amount: number };
type Venta = {
  id: number;
  ts: string;
  total: number;
  discount: number | null;
  cash_received: number | null;
  change_given: number | null;
  voided: boolean;
  seller_name: string | null;
  sale_payments?: Pago[] | null;
  payment_method: string | null;
};

const clp = (n: number) => `$${Math.round(Number(n) || 0).toLocaleString("es-CL")}`;
const cantidad = (q: number) => (Number.isInteger(Number(q)) ? String(q) : Number(q).toLocaleString("es-CL", { maximumFractionDigits: 3 }));

export default function TicketVenta({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { settings } = useStoreSettings();
  const [venta, setVenta] = useState<Venta | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/sales/${encodeURIComponent(id)}`)
      .then(async (r) => {
        if (!r.ok) throw new Error("No se encontró la venta");
        const data = await r.json();
        setVenta(data.sale);
        setItems(data.items ?? []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Error al cargar la venta"));
  }, [id]);

  // Imprimir cuando ya están los datos y la tienda (nombre y dirección).
  useEffect(() => {
    if (!venta || !settings) return;
    const t = setTimeout(() => window.print(), 300);
    return () => clearTimeout(t);
  }, [venta, settings]);

  if (error) return <p className="p-6 text-sm text-red-700">{error}</p>;
  if (!venta) return <p className="p-6 text-sm text-gray-600">Cargando ticket…</p>;

  const pagos: Pago[] = venta.sale_payments?.length
    ? venta.sale_payments
    : [{ method: venta.payment_method ?? "", amount: venta.total }];
  const subtotal = items.reduce((s, i) => s + Number(i.subtotal), 0);

  return (
    <div className="p-4">
      <style>{`
        @page { size: 80mm auto; margin: 0; }
        @media print {
          body * { visibility: hidden !important; }
          .ticket, .ticket * { visibility: visible !important; }
          .ticket { position: absolute; left: 0; top: 0; }
        }
      `}</style>

      <div className="mb-4 flex gap-2 print:hidden">
        <button onClick={() => window.print()} className="rounded-xl bg-brand-boton px-4 py-2 text-sm font-bold text-brand-contraste">
          Imprimir
        </button>
        <button onClick={() => window.close()} className="rounded-xl px-4 py-2 text-sm font-bold text-gray-700 ring-1 ring-gray-200">
          Cerrar
        </button>
      </div>

      <div className="ticket w-[72mm] bg-white p-2 font-mono text-[11px] leading-tight text-black">
        <div className="text-center">
          <p className="text-sm font-bold">{settings?.storeName || "Olivo Market"}</p>
          {settings?.storeAddress && <p>{settings.storeAddress}</p>}
          {settings?.storePhone && <p>{settings.storePhone}</p>}
        </div>
        <hr className="my-2 border-dashed border-black" />
        <p>Venta #{venta.id}</p>
        <p>{new Date(venta.ts).toLocaleString("es-CL", { timeZone: "America/Santiago" })}</p>
        {venta.seller_name && <p>Atendió: {venta.seller_name}</p>}
        {venta.voided && <p className="mt-1 text-center font-bold">*** VENTA ANULADA ***</p>}
        <hr className="my-2 border-dashed border-black" />

        {items.map((i, n) => (
          <div key={n} className="mb-1">
            <p className="break-words">{i.product_name || i.product_barcode}</p>
            <p className="flex justify-between">
              <span>{cantidad(i.quantity)} x {clp(i.unit_price)}</span>
              <span>{clp(i.subtotal)}</span>
            </p>
          </div>
        ))}

        <hr className="my-2 border-dashed border-black" />
        {Number(venta.discount) > 0 && (
          <>
            <p className="flex justify-between"><span>Subtotal</span><span>{clp(subtotal)}</span></p>
            <p className="flex justify-between"><span>Descuento</span><span>-{clp(Number(venta.discount))}</span></p>
          </>
        )}
        <p className="flex justify-between text-sm font-bold"><span>TOTAL</span><span>{clp(venta.total)}</span></p>
        <div className="mt-1">
          {pagos.map((p, n) => (
            <p key={n} className="flex justify-between"><span>{paymentLabel(p.method)}</span><span>{clp(p.amount)}</span></p>
          ))}
          {Number(venta.change_given) > 0 && (
            <p className="flex justify-between"><span>Vuelto</span><span>{clp(Number(venta.change_given))}</span></p>
          )}
        </div>
        <hr className="my-2 border-dashed border-black" />
        <p className="text-center">¡Gracias por tu compra!</p>
        <p className="mt-1 text-center text-[10px]">Comprobante interno, no válido como boleta.</p>
      </div>
    </div>
  );
}
