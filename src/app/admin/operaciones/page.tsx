"use client";

import React, { useState } from "react";
import {
  ShoppingCartIcon,
  ArchiveBoxArrowDownIcon,
  BanknotesIcon,
  LockClosedIcon,
} from "@heroicons/react/24/outline";
import { POSProvider } from "@/contexts/POSContext";
import SaleMode from "@/components/admin/operaciones/SaleMode";
import ReceptionMode from "@/components/admin/operaciones/ReceptionMode";
import CajaMode from "@/components/admin/operaciones/CajaMode";
import CloseMode from "@/components/admin/operaciones/CloseMode";
import { useOpenShift } from "@/hooks/useOpenShift";

type OperationsMode = "VENTA" | "RECEPCION" | "CAJA" | "CIERRE";

const TABS: { id: OperationsMode; label: string; icon: typeof ShoppingCartIcon }[] = [
  { id: "VENTA",     label: "Venta",     icon: ShoppingCartIcon },
  { id: "RECEPCION", label: "Recepción", icon: ArchiveBoxArrowDownIcon },
  { id: "CAJA",      label: "Caja",      icon: BanknotesIcon },
  { id: "CIERRE",    label: "Cierre",    icon: LockClosedIcon },
];

export default function OperacionesPage() {
  const [mode, setMode] = useState<OperationsMode>("VENTA");
  const { open: cajaAbierta, loading: cargandoCaja, refresh: refrescarCaja } = useOpenShift();

  // Sin caja abierta no se vende: si la venta no queda dentro de un turno, el
  // arqueo del día nunca cuadra. El servidor rechaza igual, esto evita que el
  // vendedor llegue hasta el final del carrito para recibir el error.
  const ventaBloqueada = mode === "VENTA" && cajaAbierta === false && !cargandoCaja;

  return (
    <div className="flex flex-col min-h-[calc(100vh-3.5rem)] bg-[#0a0a0a] text-white">
      {/* Tab bar — top on desktop, sticky bottom on mobile */}
      <div className="sticky top-0 md:relative z-30 bg-[#0a0a0a] border-b border-white/5">
        <div className="flex max-w-4xl mx-auto px-2">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setMode(id)}
              className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-3 sm:py-4 text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all border-b-2 ${
                mode === id
                  ? "border-emerald-500 text-emerald-400"
                  : "border-transparent text-white/30 hover:text-white/60"
              }`}
            >
              <Icon className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Mode content */}
      <div className="flex-1 overflow-y-auto">
        {mode === "VENTA" && ventaBloqueada && (
          <div className="max-w-md mx-auto px-6 py-16 text-center">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-5">
              <BanknotesIcon className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-black text-white">La caja está cerrada</h2>
            <p className="mt-2 text-white/50 leading-relaxed">
              Para registrar ventas primero tienes que abrir la caja del día. Así cada venta queda
              dentro de un turno y el arqueo cuadra al cierre.
            </p>
            <button
              type="button"
              onClick={() => setMode("CAJA")}
              className="mt-6 inline-flex items-center justify-center rounded-xl bg-emerald-600 px-6 h-12 font-bold text-white transition-colors hover:bg-emerald-500"
            >
              Ir a abrir la caja
            </button>
            <button
              type="button"
              onClick={refrescarCaja}
              className="mt-3 block w-full text-xs font-bold uppercase tracking-widest text-white/30 hover:text-white/60"
            >
              Ya la abrí, reintentar
            </button>
          </div>
        )}
        {mode === "VENTA" && !ventaBloqueada && (
          <POSProvider>
            <SaleMode />
          </POSProvider>
        )}
        {mode === "RECEPCION" && <ReceptionMode />}
        {mode === "CAJA"      && <CajaMode onShiftChange={refrescarCaja} />}
        {mode === "CIERRE"    && <CloseMode />}
      </div>
    </div>
  );
}
