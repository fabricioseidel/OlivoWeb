"use client";

import React, { useState, useEffect, useCallback } from "react";
import { getCurrentShift, closeShiftAction } from "@/actions/shifts";
import { useToast } from "@/contexts/ToastContext";
import { CashShift } from "@/server/shifts.service";
import { LockClosedIcon, ArrowPathIcon, BanknotesIcon, CreditCardIcon } from "@heroicons/react/24/outline";

type Method = "CASH" | "DEBIT" | "CREDIT" | "TRANSFER" | "WALLET" | "OTHER";

const METHOD_LABEL: Record<Method, string> = {
  CASH: "Efectivo", DEBIT: "Débito", CREDIT: "Crédito",
  TRANSFER: "Transferencia", WALLET: "Billetera", OTHER: "Otro",
};
const METHOD_ICON: Record<Method, typeof BanknotesIcon> = {
  CASH: BanknotesIcon, DEBIT: CreditCardIcon, CREDIT: CreditCardIcon,
  TRANSFER: ArrowPathIcon, WALLET: CreditCardIcon, OTHER: CreditCardIcon,
};

interface SalePayment { method: Method; amount: number; sale_id: number; }

export default function CloseMode() {
  const { showToast } = useToast();
  const [shift, setShift] = useState<CashShift | null>(null);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);
  // Esperado por método (calculado server-side via la lógica de cierre, aproximado aquí)
  const [expected, setExpected] = useState<Partial<Record<Method, number>>>({});
  // Conteo físico que ingresa el cajero
  const [counts, setCounts] = useState<Partial<Record<Method, number>>>({});

  const fetchShift = useCallback(async () => {
    setLoading(true);
    try {
      const s = (await getCurrentShift()) as any;
      setShift(s);
      if (!s?.id) return;

      // Traer ventas + movimientos del turno y agrupar por método
      const res = await fetch(`/api/admin/caja?shiftId=${s.id}`);
      if (!res.ok) return;
      const data = await res.json();

      const sales: Array<{ id: number; sale_payments?: SalePayment[]; payment_method?: string; total: number }> = data.sales || [];
      const movements: Array<{ amount: number; type: "IN" | "OUT" }> = data.movements || [];

      const byMethod: Partial<Record<Method, number>> = {};
      sales.forEach(s => {
        if (Array.isArray((s as any).sale_payments) && (s as any).sale_payments.length) {
          (s as any).sale_payments.forEach((p: SalePayment) => {
            byMethod[p.method] = (byMethod[p.method] || 0) + Number(p.amount);
          });
        } else {
          // Fallback al método único legacy
          const m: Method =
            /cash|efectivo/i.test(s.payment_method || "") ? "CASH" :
            /debit/i.test(s.payment_method || "")          ? "DEBIT" :
            /credit|card|tarjeta/i.test(s.payment_method || "") ? "CREDIT" :
            /transfer/i.test(s.payment_method || "")        ? "TRANSFER" :
            "OTHER";
          byMethod[m] = (byMethod[m] || 0) + Number(s.total);
        }
      });

      // Cash incluye efectivo inicial + movimientos
      const cashIn = movements.filter(m => m.type === "IN").reduce((a, m) => a + Number(m.amount), 0);
      const cashOut = movements.filter(m => m.type === "OUT").reduce((a, m) => a + Number(m.amount), 0);
      byMethod.CASH = (byMethod.CASH || 0) + Number(s.starting_cash) + cashIn - cashOut;

      setExpected(byMethod);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchShift(); }, [fetchShift]);

  const handleClose = async () => {
    if (!shift) return;
    setClosing(true);
    // Solo enviar los métodos que el cajero ingresó (o que tienen esperado > 0)
    const payload: Partial<Record<Method, number>> = {};
    (Object.keys(METHOD_LABEL) as Method[]).forEach(m => {
      if (counts[m] !== undefined || (expected[m] ?? 0) > 0) {
        payload[m] = Number(counts[m] ?? 0);
      }
    });
    const res = await closeShiftAction(shift.id, payload);
    if (res.ok) {
      const totalDiff = Object.values(res.breakdown || {}).reduce((a, b) => a + (b?.difference ?? 0), 0);
      showToast(`Caja cerrada ✓ Diferencia total: $${totalDiff.toLocaleString()}`, totalDiff === 0 ? "success" : "info");
      setShift(null); setCounts({}); fetchShift();
    } else {
      showToast(res.toastMessage || "Error al cerrar caja", "error");
    }
    setClosing(false);
  };

  if (loading) return <div className="p-10 text-center text-white/40 text-xs font-black uppercase tracking-widest animate-pulse">Cargando…</div>;

  if (!shift) return (
    <div className="max-w-sm mx-auto p-6 text-center">
      <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
        <LockClosedIcon className="h-8 w-8 text-white/30" />
      </div>
      <p className="text-white/40 text-sm font-bold">No hay turno abierto.</p>
      <p className="text-white/20 text-xs mt-1">Abre un turno en la pestaña Caja primero.</p>
    </div>
  );

  const methodsWithActivity = (Object.keys(METHOD_LABEL) as Method[])
    .filter(m => (expected[m] ?? 0) > 0 || counts[m] !== undefined);

  const totalExpected = methodsWithActivity.reduce((a, m) => a + (expected[m] ?? 0), 0);
  const totalCounted  = methodsWithActivity.reduce((a, m) => a + (counts[m] ?? 0), 0);
  const totalDiff     = totalCounted - totalExpected;

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <div className="text-center">
        <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-2">
          <LockClosedIcon className="h-6 w-6 text-red-400" />
        </div>
        <h2 className="text-lg font-black uppercase tracking-widest">Cerrar Turno</h2>
        <p className="text-white/30 text-xs mt-1">
          Apertura: {new Date(shift.started_at).toLocaleTimeString()} ·
          Cuenta físicamente el efectivo y registra los totales de cada terminal
        </p>
      </div>

      <div className="space-y-2">
        {methodsWithActivity.length === 0 && (
          <div className="bg-white/5 rounded-2xl p-6 text-center border border-white/10">
            <p className="text-white/40 text-xs">No hay actividad en este turno todavía.</p>
          </div>
        )}
        {methodsWithActivity.map(m => {
          const Icon = METHOD_ICON[m];
          const exp = expected[m] ?? 0;
          const act = counts[m] ?? 0;
          const diff = act - exp;
          const hasInput = counts[m] !== undefined;
          return (
            <div key={m} className="bg-white/5 rounded-2xl p-3 border border-white/10">
              <div className="flex items-center gap-3 mb-2">
                <Icon className="h-5 w-5 text-emerald-400 shrink-0" />
                <span className="text-[11px] font-black uppercase tracking-widest text-white flex-1">{METHOD_LABEL[m]}</span>
                <span className="text-[10px] text-yellow-400 font-bold">Esperado: $ {exp.toLocaleString()}</span>
              </div>
              <div className="flex gap-2 items-center">
                <input type="number" inputMode="numeric" placeholder="Contado físico"
                  value={hasInput ? (act || "") : ""}
                  onChange={e => setCounts(c => ({ ...c, [m]: Number(e.target.value) || 0 }))}
                  className="flex-1 bg-black border border-white/10 rounded-xl p-2.5 text-base font-black text-white outline-none focus:border-emerald-500" />
                <button onClick={() => setCounts(c => ({ ...c, [m]: exp }))}
                  className="px-3 py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-500/20">
                  = Esperado
                </button>
              </div>
              {hasInput && (
                <div className={`mt-2 flex justify-between items-center text-xs ${diff === 0 ? "text-white/40" : diff > 0 ? "text-emerald-400" : "text-red-400"}`}>
                  <span className="font-bold uppercase tracking-widest text-[9px]">Diferencia</span>
                  <span className="font-black">{diff >= 0 ? "+" : ""}$ {diff.toLocaleString()}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Total */}
      <div className={`flex justify-between items-center p-4 rounded-2xl border ${
        totalDiff === 0 ? "bg-white/5 border-white/10 text-white/60" :
        totalDiff > 0   ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" :
                          "bg-red-500/10 border-red-500/30 text-red-400"
      }`}>
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest opacity-70">Diferencia total</p>
          <p className="text-[10px] opacity-60">Esperado ${totalExpected.toLocaleString()} · Contado ${totalCounted.toLocaleString()}</p>
        </div>
        <span className="text-2xl font-black">{totalDiff >= 0 ? "+" : ""}$ {totalDiff.toLocaleString()}</span>
      </div>

      <button onClick={handleClose} disabled={closing}
        className={`w-full h-14 rounded-2xl flex items-center justify-center gap-2 font-black uppercase tracking-widest text-sm transition-all ${
          closing ? "bg-white/5 text-white/20" : "bg-red-500 text-white active:bg-red-600"
        }`}>
        {closing ? <ArrowPathIcon className="h-5 w-5 animate-spin" /> : <><LockClosedIcon className="h-5 w-5" /> Cerrar Caja</>}
      </button>
    </div>
  );
}
