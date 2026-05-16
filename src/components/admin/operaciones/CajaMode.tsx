"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { getCurrentShift, openShiftAction, addCashMovementAction } from "@/actions/shifts";
import { useToast } from "@/contexts/ToastContext";
import { CashShift } from "@/server/shifts.service";
import {
  BanknotesIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon,
  PlusCircleIcon, ArrowPathIcon,
} from "@heroicons/react/24/outline";

interface CashMovement { id: string; amount: number; type: "IN" | "OUT"; reason: string; created_at: string; }
interface ShiftSale { id: number; total: number; payment_method: string; ts: string; }

export default function CajaMode() {
  const { data: session } = useSession();
  const { showToast } = useToast();
  const [shift, setShift] = useState<CashShift | null>(null);
  const [loading, setLoading] = useState(true);
  const [startingCash, setStartingCash] = useState(10000);
  const [movementAmount, setMovementAmount] = useState(0);
  const [movementReason, setMovementReason] = useState("");
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [shiftSales, setShiftSales] = useState<ShiftSale[]>([]);

  const fetchShift = useCallback(async () => {
    setLoading(true);
    try { setShift((await getCurrentShift()) as any); }
    catch { /* noop */ } finally { setLoading(false); }
  }, []);

  const fetchShiftData = useCallback(async (shiftId: string) => {
    try {
      const res = await fetch(`/api/admin/caja?shiftId=${shiftId}`);
      if (!res.ok) return;
      const data = await res.json();
      setMovements(data.movements || []);
      setShiftSales(data.sales || []);
    } catch { /* noop */ }
  }, []);

  useEffect(() => { fetchShift(); }, [fetchShift]);
  useEffect(() => { if (shift?.id) fetchShiftData(shift.id); }, [shift?.id, fetchShiftData]);

  const totalCashSales = shiftSales.filter(s => /cash|efectivo/i.test(s.payment_method)).reduce((a, s) => a + Number(s.total), 0);
  const totalIn = movements.filter(m => m.type === "IN").reduce((a, m) => a + Number(m.amount), 0);
  const totalOut = movements.filter(m => m.type === "OUT").reduce((a, m) => a + Number(m.amount), 0);
  const expectedCash = (shift ? Number(shift.starting_cash) : 0) + totalCashSales + totalIn - totalOut;
  const totalAllSales = shiftSales.reduce((a, s) => a + Number(s.total), 0);

  const handleOpen = async () => {
    const userId = (session as any)?.userId || (session?.user as any)?.id;
    const res = await openShiftAction(startingCash, userId);
    if (res.ok) { showToast("Caja abierta ✓", "success"); fetchShift(); }
    else showToast(res.toastMessage || "Error", "error");
  };

  const handleMovement = async (type: "IN" | "OUT") => {
    if (!shift || movementAmount <= 0) { showToast("Ingresa un monto válido", "error"); return; }
    const res = await addCashMovementAction(shift.id, movementAmount, type, movementReason || `${type === "IN" ? "Ingreso" : "Egreso"} manual`);
    if (res.ok) {
      showToast("Movimiento registrado ✓", "success");
      setMovementAmount(0); setMovementReason(""); fetchShiftData(shift.id);
    } else showToast(res.toastMessage || "Error", "error");
  };

  if (loading) return <div className="p-10 text-center text-white/40 text-xs font-black uppercase tracking-widest animate-pulse">Cargando…</div>;

  if (!shift) return (
    <div className="max-w-sm mx-auto p-6 space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <PlusCircleIcon className="h-8 w-8 text-emerald-400" />
        </div>
        <h2 className="text-xl font-black uppercase tracking-widest mb-1">Abrir Caja</h2>
        <p className="text-white/40 text-xs">Ingresa el efectivo inicial del turno</p>
      </div>
      <input type="number" value={startingCash || ""} onChange={e => setStartingCash(Number(e.target.value))}
        className="w-full bg-white/5 border-2 border-white/10 rounded-2xl p-4 text-2xl font-black text-white outline-none focus:border-emerald-500 text-center" />
      <div className="grid grid-cols-4 gap-2">
        {[5000, 10000, 20000, 50000].map(v => (
          <button key={v} onClick={() => setStartingCash(v)}
            className={`text-[10px] font-bold py-2.5 rounded-xl border transition-all ${startingCash === v ? "bg-emerald-500 border-emerald-400 text-black" : "bg-white/5 border-white/10 text-white/50"}`}>
            ${v / 1000}k
          </button>
        ))}
      </div>
      <button onClick={handleOpen} className="w-full h-14 bg-emerald-500 text-black rounded-2xl font-black uppercase tracking-widest text-sm active:bg-emerald-600 transition-colors">
        Abrir Turno
      </button>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      {/* Stats */}
      <div className="bg-white/5 rounded-2xl p-5 border border-white/5">
        <div className="flex justify-between items-center mb-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Turno Activo</p>
          <button onClick={() => shift && fetchShiftData(shift.id)} className="p-1.5 text-white/30 hover:text-white">
            <ArrowPathIcon className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Inicio", value: `$ ${Number(shift.starting_cash).toLocaleString()}`, color: "text-white" },
            { label: "Ventas Efectivo", value: `$ ${totalCashSales.toLocaleString()}`, color: "text-emerald-400" },
            { label: "Total Ventas", value: `$ ${totalAllSales.toLocaleString()}`, color: "text-white" },
            { label: "Esperado en Caja", value: `$ ${expectedCash.toLocaleString()}`, color: "text-yellow-400 font-black" },
          ].map(s => (
            <div key={s.label} className="bg-white/5 rounded-xl p-3">
              <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-0.5">{s.label}</p>
              <p className={`text-base font-black ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Movements form */}
      <div className="bg-white/5 rounded-2xl p-4 border border-white/5 space-y-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-white/50">Ingreso / Egreso Manual</p>
        <input type="number" placeholder="Monto $" value={movementAmount || ""} onChange={e => setMovementAmount(Number(e.target.value))}
          className="w-full bg-black border border-white/10 rounded-xl p-3 font-black text-white outline-none focus:border-emerald-500" />
        <input type="text" placeholder="Motivo (opcional)" value={movementReason} onChange={e => setMovementReason(e.target.value)}
          className="w-full bg-black border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-emerald-500" />
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => handleMovement("IN")}
            className="flex items-center justify-center gap-2 py-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500/20 active:scale-[0.98] transition-all">
            <ArrowTrendingUpIcon className="h-4 w-4" /> Ingreso
          </button>
          <button onClick={() => handleMovement("OUT")}
            className="flex items-center justify-center gap-2 py-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500/20 active:scale-[0.98] transition-all">
            <ArrowTrendingDownIcon className="h-4 w-4" /> Egreso
          </button>
        </div>
      </div>

      {/* Movement history */}
      {movements.length > 0 && (
        <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
          <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-3">Movimientos del Turno</p>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {movements.map(m => (
              <div key={m.id} className={`flex justify-between items-center p-2.5 rounded-xl text-sm ${m.type === "IN" ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
                <span className="text-white/70 truncate mr-2">{m.reason || (m.type === "IN" ? "Ingreso" : "Egreso")}</span>
                <span className={`font-black shrink-0 ${m.type === "IN" ? "text-emerald-400" : "text-red-400"}`}>
                  {m.type === "IN" ? "+" : "-"}$ {Number(m.amount).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent sales */}
      {shiftSales.length > 0 && (
        <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
          <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-3">Ventas del Turno ({shiftSales.length})</p>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {shiftSales.slice(0, 20).map(s => (
              <div key={s.id} className="flex justify-between items-center p-2.5 rounded-xl bg-white/5 text-sm">
                <div>
                  <span className="font-bold text-white/70">#{s.id}</span>
                  <span className="text-white/30 text-[10px] ml-2">{new Date(s.ts).toLocaleTimeString()}</span>
                </div>
                <span className="font-black text-emerald-400">$ {Number(s.total).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
