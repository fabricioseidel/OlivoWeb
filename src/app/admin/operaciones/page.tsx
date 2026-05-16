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

type OperationsMode = "VENTA" | "RECEPCION" | "CAJA" | "CIERRE";

const TABS: { id: OperationsMode; label: string; icon: typeof ShoppingCartIcon }[] = [
  { id: "VENTA",     label: "Venta",     icon: ShoppingCartIcon },
  { id: "RECEPCION", label: "Recepción", icon: ArchiveBoxArrowDownIcon },
  { id: "CAJA",      label: "Caja",      icon: BanknotesIcon },
  { id: "CIERRE",    label: "Cierre",    icon: LockClosedIcon },
];

export default function OperacionesPage() {
  const [mode, setMode] = useState<OperationsMode>("VENTA");

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
        {mode === "VENTA" && (
          <POSProvider>
            <SaleMode />
          </POSProvider>
        )}
        {mode === "RECEPCION" && <ReceptionMode />}
        {mode === "CAJA"      && <CajaMode />}
        {mode === "CIERRE"    && <CloseMode />}
      </div>
    </div>
  );
}
