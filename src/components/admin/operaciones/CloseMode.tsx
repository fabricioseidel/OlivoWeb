"use client";

import React, { useState, useEffect, useCallback } from "react";
import { getCurrentShift, closeShiftAction } from "@/actions/shifts";
import { useToast } from "@/contexts/ToastContext";
import { CashShift } from "@/server/shifts.service";
import { LockClosedIcon, ArrowPathIcon } from "@heroicons/react/24/outline";

export default function CloseMode() {
  const { showToast } = useToast();
  const [shift, setShift] = useState<CashShift | null>(null);
  const [loading, setLoading] = useState(true);
  const [actualCash, setActualCash] = useState(0);
  const [closing, setClosing] = useState(false);
  const [expectedCash, setExpectedCash] = useState(0);

  const fetchShift = useCallback(async () => {
    setLoading(true);
    try {
      const s = (await getCurrentShift()) as any;
      setShift(s);
      // Fetch expected cash from the caja API
      if (s?.id) {
        const res = await fetch(`/api/admin/caja?shiftId=${s.id}`);
        if (res.ok) {
          const data = await res.json();
          const cashSales = (data.sales || []).filter((x: any) => /cash|efectivo/i.test(x.payment_method)).reduce((a: number, x: any) => a + Number(x.total), 0);
          const totalIn = (data.movements || []).filter((m: any) => m.type === "IN").reduce((a: number, m: any) => a + Number(m.amount), 0);
          const totalOut = (data.movements || []).filter((m: any) => m.type === "OUT").reduce((a: number, m: any) => a + Number(m.amount), 0);
          setExpectedCash(Number(s.starting_cash) + cashSales + totalIn - totalOut);
        }
      }
    } catch { /* noop */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchShift(); }, [fetchShift]);

  const handleClose = async () => {
    if (!shift) return;
    setClosing(true);
    const res = await closeShiftAction(shift.id, actualCash);
    if (res.ok) { showToast("Caja cerrada ✓", "success"); setShift(null); fetchShift(); }
    else showToast(res.toastMessage || "Error al cerrar caja", "error");
    setClosing(false);
  };

  const diff = actualCash - expectedCash;

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

  return (
    <div className="max-w-sm mx-auto p-6 space-y-5">
      <div className="text-center">
        <div className="w-14 h-14 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
          <LockClosedIcon className="h-7 w-7 text-red-400" />
        </div>
        <h2 className="text-xl font-black uppercase tracking-widest">Cerrar Turno</h2>
        <p className="text-white/30 text-xs mt-1">Apertura: {new Date(shift.started_at).toLocaleTimeString()}</p>
      </div>

      <div className="bg-white/5 rounded-2xl p-4 border border-white/5 space-y-1">
        <p className="text-[9px] font-black uppercase tracking-widest text-white/30">Efectivo esperado</p>
        <p className="text-2xl font-black text-yellow-400">$ {expectedCash.toLocaleString()}</p>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-black uppercase tracking-widest text-white/50">Efectivo contado físicamente</p>
        <input type="number" value={actualCash || ""} onChange={e => setActualCash(Number(e.target.value))} placeholder="0"
          className="w-full bg-black border-2 border-white/10 rounded-2xl p-4 text-2xl font-black text-white outline-none focus:border-emerald-500 text-center" />
        <div className="grid grid-cols-4 gap-1.5">
          {[5000, 10000, 20000, 50000].map(v => (
            <button key={v} onClick={() => setActualCash(v)}
              className={`text-[10px] font-bold py-2 rounded-xl border transition-all ${actualCash === v ? "bg-emerald-500 border-emerald-400 text-black" : "bg-white/5 border-white/10 text-white/50"}`}>
              ${v / 1000}k
            </button>
          ))}
        </div>
        <button onClick={() => setActualCash(expectedCash)} className="w-full text-[10px] font-bold py-2 rounded-xl bg-white/5 text-white/40 border border-white/10">
          Usar monto esperado
        </button>
      </div>

      {actualCash > 0 && (
        <div className={`flex justify-between items-center p-4 rounded-2xl border ${diff >= 0 ? "bg-emerald-500/10 border-emerald-500/30" : "bg-red-500/10 border-red-500/30"}`}>
          <span className="text-[10px] font-black uppercase tracking-widest text-white/50">Diferencia</span>
          <span className={`text-2xl font-black ${diff >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {diff >= 0 ? "+" : ""}$ {diff.toLocaleString()}
          </span>
        </div>
      )}

      <button onClick={handleClose} disabled={closing || actualCash <= 0}
        className={`w-full h-14 rounded-2xl flex items-center justify-center gap-2 font-black uppercase tracking-widest text-sm transition-all ${
          closing || actualCash <= 0 ? "bg-white/5 text-white/20" : "bg-red-500 text-white active:bg-red-600"
        }`}>
        {closing ? <ArrowPathIcon className="h-5 w-5 animate-spin" /> : <><LockClosedIcon className="h-5 w-5" /> Cerrar Caja</>}
      </button>
    </div>
  );
}
