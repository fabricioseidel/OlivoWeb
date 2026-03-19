"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { getCurrentShift, openShiftAction, closeShiftAction, addCashMovementAction } from "@/actions/shifts";
import { CashShift } from "@/server/shifts.service";
import OlivoButton from "@/components/OlivoButton";
import { 
  BanknotesIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon,
  ClockIcon, LockClosedIcon, PlusCircleIcon, ArrowPathIcon
} from "@heroicons/react/24/outline";
import { useToast } from "@/contexts/ToastContext";

interface CashMovement {
  id: string;
  amount: number;
  type: 'IN' | 'OUT';
  reason: string;
  created_at: string;
}

interface ShiftSale {
  id: number;
  total: number;
  payment_method: string;
  ts: string;
}

export default function CajaPage() {
  const { data: session } = useSession();
  const [shift, setShift] = useState<CashShift | null>(null);
  const [loading, setLoading] = useState(true);
  const [startingCash, setStartingCash] = useState(10000);
  const [actualCash, setActualCash] = useState(0);
  const [movementAmount, setMovementAmount] = useState(0);
  const [movementReason, setMovementReason] = useState("");
  const [movementReference, setMovementReference] = useState("");
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [shiftSales, setShiftSales] = useState<ShiftSale[]>([]);
  const { showToast } = useToast();

  const fetchShift = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getCurrentShift();
      setShift(result as any);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  // Fetch movements and sales via API route (server-side, no client supabase)
  const fetchShiftData = useCallback(async (shiftId: string) => {
    try {
      const res = await fetch(`/api/admin/caja?shiftId=${shiftId}`);
      if (!res.ok) return;
      const data = await res.json();
      setMovements(data.movements || []);
      setShiftSales(data.sales || []);
    } catch (err) {
      console.error("Error fetching shift data:", err);
    }
  }, []);

  useEffect(() => { fetchShift(); }, [fetchShift]);
  useEffect(() => { if (shift?.id) fetchShiftData(shift.id); }, [shift?.id, fetchShiftData]);

  // Calculate real expected cash
  const totalCashSales = shiftSales
    .filter(s => s.payment_method === 'cash' || s.payment_method === 'efectivo')
    .reduce((acc, s) => acc + Number(s.total), 0);
  const totalIn = movements.filter(m => m.type === 'IN').reduce((acc, m) => acc + Number(m.amount), 0);
  const totalOut = movements.filter(m => m.type === 'OUT').reduce((acc, m) => acc + Number(m.amount), 0);
  const expectedCash = (shift ? Number(shift.starting_cash) : 0) + totalCashSales + totalIn - totalOut;
  const totalAllSales = shiftSales.reduce((acc, s) => acc + Number(s.total), 0);

  const handleOpenShift = async () => {
    const userId = (session as any)?.userId || (session?.user as any)?.id || undefined;
    const res = await openShiftAction(startingCash, userId);
    if (res.ok) { showToast("Caja abierta ✓", "success"); fetchShift(); }
    else showToast(res.toastMessage || "Error al abrir caja", "error");
  };

  const handleCloseShift = async () => {
    if (!shift) return;
    const res = await closeShiftAction(shift.id, actualCash);
    if (res.ok) { showToast("Caja cerrada ✓", "success"); setShift(null); fetchShift(); }
    else showToast(res.toastMessage || "Error al cerrar caja", "error");
  };

  const handleMovement = async (type: 'IN' | 'OUT') => {
    if (!shift || movementAmount <= 0) {
      showToast("Ingresa un monto válido", "error");
      return;
    }
    const finalReason = movementReference ? `${movementReason} (Ref: ${movementReference})` : movementReason;
    const res = await addCashMovementAction(shift.id, movementAmount, type, finalReason || `${type === 'IN' ? 'Ingreso' : 'Egreso'} manual`);
    if (res.ok) {
      showToast("Movimiento registrado ✓", "success");
      setMovementAmount(0);
      setMovementReason("");
      setMovementReference("");
      fetchShiftData(shift.id);
    } else {
      showToast(res.toastMessage || "Error al registrar movimiento", "error");
    }
  };

  const refreshAll = () => {
    if (shift?.id) fetchShiftData(shift.id);
    showToast("Datos actualizados", "success");
  };

  if (loading) return <div className="p-10 animate-pulse text-emerald-500 font-bold uppercase tracking-widest text-center">Cargando datos de caja...</div>;

  // ── NO SHIFT OPEN ──
  if (!shift) {
    return (
      <div className="max-w-md mx-auto py-10 px-4">
        <div className="bg-white rounded-3xl p-8 shadow-2xl border border-emerald-100">
          <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-6 mx-auto">
            <PlusCircleIcon className="h-8 w-8 text-emerald-500" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 text-center mb-2">Abrir Nueva Caja</h1>
          <p className="text-slate-500 text-center mb-8 text-sm">Ingresa el monto inicial para comenzar el turno.</p>
          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Saldo Inicial ($)</label>
              <input type="number" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-xl font-black text-slate-900 focus:border-emerald-500 outline-none"
                value={startingCash} onChange={(e) => setStartingCash(Number(e.target.value))} />
            </div>
            {/* Quick start amounts */}
            <div className="grid grid-cols-4 gap-2">
              {[5000, 10000, 20000, 50000].map(v => (
                <button key={v} onClick={() => setStartingCash(v)}
                  className={`text-xs font-bold py-2 rounded-xl border transition-all ${startingCash === v ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-emerald-300'}`}>
                  ${(v/1000)}k
                </button>
              ))}
            </div>
            <OlivoButton fullWidth size="lg" onClick={handleOpenShift}>Abrir Turno de Caja</OlivoButton>
          </div>
        </div>
      </div>
    );
  }

  // ── SHIFT OPEN ──
  return (
    <div className="max-w-6xl mx-auto py-4 px-3 md:py-6 md:px-4 space-y-4 md:space-y-6">
      {/* Stats Banner */}
      <div className="bg-emerald-950 text-white rounded-2xl md:rounded-[2.5rem] p-6 md:p-10 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full -mr-32 -mt-32 blur-3xl opacity-50" />
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-6 md:mb-10">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400/80 mb-1">Caja Activa</p>
              <h2 className="text-2xl md:text-4xl font-black tracking-tight">Sesión Actual</h2>
            </div>
            <div className="flex gap-2 items-center">
              <button onClick={refreshAll} className="p-2 bg-emerald-500/20 rounded-full hover:bg-emerald-500/30 transition-colors" title="Actualizar">
                <ArrowPathIcon className="h-4 w-4 text-emerald-400" />
              </button>
              <div className="bg-emerald-500/20 px-3 py-1 rounded-full flex items-center gap-2 border border-emerald-500/30">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Abierto</span>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6">
            <div>
              <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400/50">Inicio</span>
              <p className="text-lg md:text-xl font-bold">$ {Number(shift.starting_cash).toLocaleString()}</p>
            </div>
            <div>
              <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400/50">Ventas Efectivo</span>
              <p className="text-lg md:text-xl font-bold text-emerald-300">$ {totalCashSales.toLocaleString()}</p>
            </div>
            <div>
              <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400/50">Total Ventas</span>
              <p className="text-lg md:text-xl font-bold">$ {totalAllSales.toLocaleString()}</p>
            </div>
            <div>
              <span className="text-[9px] font-black uppercase tracking-widest text-yellow-400/80">Esperado en Caja</span>
              <p className="text-lg md:text-xl font-black text-yellow-300">$ {expectedCash.toLocaleString()}</p>
            </div>
            <div>
              <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400/50">Apertura</span>
              <p className="text-base md:text-lg font-bold truncate">{new Date(shift.started_at).toLocaleTimeString()}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 md:gap-6">
        {/* Left Column: Actions */}
        <div className="flex-1 space-y-4">
          {/* Movements */}
          <div className="bg-white rounded-2xl p-5 md:p-8 border border-slate-100 shadow-lg">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-4 flex items-center gap-2">
              <PlusCircleIcon className="h-4 w-4 text-emerald-500" /> Ingresos / Egresos
            </h3>
            <div className="space-y-3">
              <input type="number" placeholder="Monto $"
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 font-black outline-none focus:border-emerald-500"
                value={movementAmount || ""} onChange={(e) => setMovementAmount(Number(e.target.value))} />
              <input type="text" placeholder="Motivo"
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 font-bold text-sm outline-none focus:border-emerald-500"
                value={movementReason} onChange={(e) => setMovementReason(e.target.value)} />
              <input type="text" placeholder="N° Comprobante / Referencia (Opcional)"
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 font-medium text-sm outline-none focus:border-emerald-500"
                value={movementReference} onChange={(e) => setMovementReference(e.target.value)} />
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => handleMovement('IN')} className="bg-emerald-50 text-emerald-600 font-black py-3 rounded-xl hover:bg-emerald-500 hover:text-white transition-all border border-emerald-100 flex items-center justify-center gap-2 text-xs uppercase tracking-widest">
                  <ArrowTrendingUpIcon className="h-4 w-4" /> Ingreso
                </button>
                <button onClick={() => handleMovement('OUT')} className="bg-rose-50 text-rose-600 font-black py-3 rounded-xl hover:bg-rose-500 hover:text-white transition-all border border-rose-100 flex items-center justify-center gap-2 text-xs uppercase tracking-widest">
                  <ArrowTrendingDownIcon className="h-4 w-4" /> Egreso
                </button>
              </div>
            </div>
          </div>

          {/* Close shift */}
          <div className="bg-white rounded-2xl p-5 md:p-8 border border-slate-100 shadow-lg">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-4 flex items-center gap-2">
              <LockClosedIcon className="h-4 w-4" /> Cierre de Turno
            </h3>
            <p className="text-xs text-slate-500 mb-3">Monto total en efectivo contado físicamente:</p>
            <input type="number"
              className="w-full bg-slate-900 border-2 border-slate-800 rounded-xl p-4 text-xl font-black text-emerald-500 outline-none mb-3"
              value={actualCash || ""} onChange={(e) => setActualCash(Number(e.target.value))} placeholder="0" />
            {actualCash > 0 && (
              <div className={`p-3 rounded-xl mb-3 text-center ${actualCash >= expectedCash ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
                <span className="text-xs font-bold text-slate-500">Diferencia: </span>
                <span className={`text-lg font-black ${actualCash >= expectedCash ? 'text-emerald-600' : 'text-red-600'}`}>
                  $ {(actualCash - expectedCash).toLocaleString()}
                </span>
              </div>
            )}
            <OlivoButton fullWidth size="lg" onClick={handleCloseShift} className="bg-slate-900 text-white hover:bg-black uppercase tracking-widest text-xs">
              Finalizar y Cerrar Caja
            </OlivoButton>
          </div>
        </div>

        {/* Right Column: Recent Activity */}
        <div className="w-full md:w-[380px] space-y-4">
          {/* Recent Sales */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-lg">
            <h3 className="text-xs font-black uppercase text-slate-900 tracking-widest mb-3 flex items-center gap-2">
              <BanknotesIcon className="h-4 w-4 text-emerald-500" /> Ventas del Turno ({shiftSales.length})
            </h3>
            {shiftSales.length === 0 ? (
              <div className="p-6 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 text-center">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Sin ventas aún</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {shiftSales.map(sale => (
                  <div key={sale.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                    <div>
                      <span className="text-xs font-bold text-slate-700">Venta #{sale.id}</span>
                      <p className="text-[10px] text-slate-400">{new Date(sale.ts).toLocaleTimeString()}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-black text-emerald-600">$ {Number(sale.total).toLocaleString()}</span>
                      <p className="text-[10px] text-slate-400 capitalize">{sale.payment_method}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Movements */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-lg">
            <h3 className="text-xs font-black uppercase text-slate-900 tracking-widest mb-3 flex items-center gap-2">
              <ClockIcon className="h-4 w-4" /> Movimientos ({movements.length})
            </h3>
            {movements.length === 0 ? (
              <div className="p-6 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 text-center">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Sin movimientos</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {movements.map(mov => (
                  <div key={mov.id} className={`flex justify-between items-center p-3 rounded-xl ${mov.type === 'IN' ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                    <div>
                      <span className="text-xs font-bold text-slate-700">{mov.reason || (mov.type === 'IN' ? 'Ingreso' : 'Egreso')}</span>
                      <p className="text-[10px] text-slate-400">{new Date(mov.created_at).toLocaleTimeString()}</p>
                    </div>
                    <span className={`text-sm font-black ${mov.type === 'IN' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {mov.type === 'IN' ? '+' : '-'}$ {Number(mov.amount).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
