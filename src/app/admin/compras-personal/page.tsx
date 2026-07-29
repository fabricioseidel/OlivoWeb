"use client";

import { useCallback, useEffect, useState } from "react";
import { UserIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import { useToast } from "@/contexts/ToastContext";

type Venta = {
  id: number;
  ts: string;
  total: number;
  seller_name: string | null;
  staff_settled_at: string | null;
};

type Vendedor = {
  sellerId: string | null;
  sellerName: string;
  total: number;
  ventas: Venta[];
};

const clp = (n: number) => `$${Math.round(n).toLocaleString("es-CL")}`;

export default function ComprasPersonalPage() {
  const { showToast } = useToast();
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [totalPendiente, setTotalPendiente] = useState(0);
  const [loading, setLoading] = useState(true);
  const [liquidando, setLiquidando] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/compras-personal", { cache: "no-store" });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setVendedores(data.vendedores || []);
      setTotalPendiente(data.totalPendiente || 0);
    } catch {
      showToast("No se pudo cargar la deuda pendiente", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const liquidar = async (v: Vendedor) => {
    const confirmado = window.confirm(
      `¿Marcar como descontadas del sueldo las ${v.ventas.length} compras de ${v.sellerName}, por ${clp(v.total)}?\n\nEsta acción deja el saldo en cero y no se puede deshacer desde acá.`
    );
    if (!confirmado) return;

    setLiquidando(v.sellerName);
    try {
      const res = await fetch("/api/admin/compras-personal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ saleIds: v.ventas.map((x) => x.id) }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Error al liquidar");
      }
      showToast(`Liquidado: ${v.sellerName}`, "success");
      await cargar();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Error al liquidar", "error");
    } finally {
      setLiquidando(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
          Compras del personal
        </h1>
        <p className="text-gray-500 font-medium mt-1">
          Compras con 25% de descuento que quedaron por cobrar. Se descuentan del sueldo a fin de mes.
        </p>
      </div>

      <div className="rounded-3xl border border-gray-200 bg-white p-6">
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
          Total pendiente de descuento
        </p>
        <p className="text-4xl font-black text-gray-900 mt-1">{clp(totalPendiente)}</p>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm font-bold uppercase tracking-widest animate-pulse">
          Cargando…
        </p>
      ) : vendedores.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-300 p-10 text-center">
          <CheckCircleIcon className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
          <p className="font-bold text-gray-900">No hay compras pendientes de cobro</p>
          <p className="text-sm text-gray-500 mt-1">
            Todas las compras del personal están pagadas o ya fueron descontadas.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {vendedores.map((v) => (
            <div key={v.sellerName} className="rounded-3xl border border-gray-200 bg-white p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <UserIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-black text-gray-900">{v.sellerName}</p>
                    <p className="text-xs text-gray-500 font-medium">
                      {v.ventas.length} {v.ventas.length === 1 ? "compra" : "compras"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-2xl font-black text-gray-900">{clp(v.total)}</span>
                  <button
                    type="button"
                    onClick={() => liquidar(v)}
                    disabled={liquidando !== null}
                    className="rounded-xl bg-emerald-600 px-5 h-11 font-bold text-white transition-colors hover:bg-emerald-500 disabled:opacity-40"
                  >
                    {liquidando === v.sellerName ? "Liquidando…" : "Marcar descontado"}
                  </button>
                </div>
              </div>

              <ul className="mt-4 border-t border-gray-100 pt-4 space-y-1.5">
                {v.ventas.map((venta) => (
                  <li key={venta.id} className="flex justify-between text-sm text-gray-600">
                    <span>
                      Venta #{venta.id} ·{" "}
                      {new Date(venta.ts).toLocaleDateString("es-CL", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </span>
                    <span className="font-bold text-gray-900">{clp(venta.total)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
