"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  getCurrentShift,
  openShiftAction,
  closeShiftAction,
  addCashMovementAction,
} from "@/actions/shifts";
import { CashShift } from "@/server/shifts.service";
import OlivoButton from "@/components/OlivoButton";
import {
  BanknotesIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ClockIcon,
  LockClosedIcon,
  PlusCircleIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { useToast } from "@/contexts/ToastContext";
import {
  PageShell,
  HeroHeader,
  StatsRow,
  StatsCard,
  StatusBadge,
  EmptyState,
} from "@/components/admin/shell";

interface CashMovement {
  id: string;
  amount: number;
  type: "IN" | "OUT";
  reason: string;
  created_at: string;
}

interface ShiftSale {
  id: number;
  total: number;
  payment_method: string;
  ts: string;
}

const CLP = (n: number) => `$${Number(n || 0).toLocaleString("es-CL")}`;

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
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

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

  useEffect(() => {
    fetchShift();
  }, [fetchShift]);

  useEffect(() => {
    if (shift?.id) fetchShiftData(shift.id);
  }, [shift?.id, fetchShiftData]);

  const totalCashSales = shiftSales
    .filter(
      (s) => s.payment_method === "cash" || s.payment_method === "efectivo"
    )
    .reduce((acc, s) => acc + Number(s.total), 0);
  const totalIn = movements
    .filter((m) => m.type === "IN")
    .reduce((acc, m) => acc + Number(m.amount), 0);
  const totalOut = movements
    .filter((m) => m.type === "OUT")
    .reduce((acc, m) => acc + Number(m.amount), 0);
  const expectedCash =
    (shift ? Number(shift.starting_cash) : 0) +
    totalCashSales +
    totalIn -
    totalOut;
  const totalAllSales = shiftSales.reduce(
    (acc, s) => acc + Number(s.total),
    0
  );

  const handleOpenShift = async () => {
    const userId =
      (session as any)?.userId || (session?.user as any)?.id || undefined;
    const res = await openShiftAction(startingCash, userId);
    if (res.ok) {
      showToast("Caja abierta ✓", "success");
      fetchShift();
    } else {
      showToast(res.toastMessage || "Error al abrir caja", "error");
    }
  };

  const handleCloseShift = async () => {
    if (!shift) return;
    const res = await closeShiftAction(shift.id, actualCash);
    if (res.ok) {
      showToast("Caja cerrada ✓", "success");
      setShift(null);
      fetchShift();
    } else {
      showToast(res.toastMessage || "Error al cerrar caja", "error");
    }
  };

  const handleMovement = async (type: "IN" | "OUT") => {
    if (!shift || movementAmount <= 0) {
      showToast("Ingresa un monto válido", "error");
      return;
    }
    const finalReason = movementReference
      ? `${movementReason} (Ref: ${movementReference})`
      : movementReason;
    const res = await addCashMovementAction(
      shift.id,
      movementAmount,
      type,
      finalReason || `${type === "IN" ? "Ingreso" : "Egreso"} manual`
    );
    if (res.ok) {
      showToast("Movimiento registrado ✓", "success");
      setMovementAmount(0);
      setMovementReason("");
      setMovementReference("");
      fetchShiftData(shift.id);
    } else {
      showToast(res.toastMessage || "Error al registrar", "error");
    }
  };

  const refreshAll = () => {
    if (shift?.id) fetchShiftData(shift.id);
    showToast("Datos actualizados", "success");
  };

  if (loading) {
    return (
      <div className="p-10 animate-pulse text-emerald-600 font-bold uppercase tracking-widest text-center">
        Cargando datos de caja...
      </div>
    );
  }

  // ── NO SHIFT OPEN ──
  if (!shift) {
    return (
      <PageShell
        maxWidth="2xl"
        hero={
          <HeroHeader
            kicker="Operación diaria"
            title="Caja"
            subtitle="Abrí un nuevo turno para empezar a operar"
            icon={<BanknotesIcon className="w-6 h-6 text-emerald-300" />}
          />
        }
      >
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl ring-1 ring-gray-100">
          <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-5 mx-auto">
            <PlusCircleIcon className="h-7 w-7 text-emerald-600" />
          </div>
          <h2 className="text-xl font-black text-gray-900 text-center mb-1">
            Abrir nueva caja
          </h2>
          <p className="text-gray-500 text-center mb-6 text-sm">
            Ingresá el monto inicial para comenzar el turno.
          </p>
          <div className="space-y-5">
            <div>
              <label className="block text-[10px] font-black uppercase text-gray-400 mb-2 tracking-widest">
                Saldo inicial ($)
              </label>
              <input
                type="number"
                className="w-full bg-gray-50 ring-2 ring-gray-100 rounded-2xl p-4 text-xl font-black text-gray-900 focus:ring-emerald-500 outline-none"
                value={startingCash}
                onChange={(e) => setStartingCash(Number(e.target.value))}
              />
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[5000, 10000, 20000, 50000].map((v) => (
                <button
                  key={v}
                  onClick={() => setStartingCash(v)}
                  className={`text-xs font-bold py-2 rounded-xl ring-1 transition-all min-h-[44px] ${
                    startingCash === v
                      ? "bg-emerald-500 text-white ring-emerald-500"
                      : "bg-gray-50 text-gray-500 ring-gray-200 hover:ring-emerald-300"
                  }`}
                >
                  ${v / 1000}k
                </button>
              ))}
            </div>
            <OlivoButton fullWidth size="lg" onClick={handleOpenShift}>
              Abrir turno de caja
            </OlivoButton>
          </div>
        </div>
      </PageShell>
    );
  }

  // ── SHIFT OPEN ──
  return (
    <PageShell
      hero={
        <HeroHeader
          kicker="Caja activa"
          title="Sesión actual"
          subtitle={`Apertura: ${new Date(
            shift.started_at
          ).toLocaleTimeString()} · Inicio: ${CLP(Number(shift.starting_cash))}`}
          icon={<BanknotesIcon className="w-6 h-6 text-emerald-300" />}
          right={
            <div className="flex items-center gap-2">
              <button
                onClick={refreshAll}
                className="p-2 bg-white/10 ring-1 ring-white/15 rounded-xl hover:bg-white/15 text-emerald-100 transition-colors min-h-[36px]"
                title="Actualizar"
              >
                <ArrowPathIcon className="h-4 w-4" />
              </button>
              <StatusBadge status="abierto" />
            </div>
          }
        />
      }
    >
      <StatsRow cols={4}>
        <StatsCard
          label="Ventas efectivo"
          value={CLP(totalCashSales)}
          tone="emerald"
          icon={<BanknotesIcon className="w-4 h-4" />}
        />
        <StatsCard
          label="Total ventas"
          value={CLP(totalAllSales)}
          tone="default"
        />
        <StatsCard
          label="Esperado en caja"
          value={CLP(expectedCash)}
          tone="amber"
          hint="Inicio + ventas + ingresos − egresos"
        />
        <StatsCard
          label="Movimientos"
          value={String(movements.length)}
          tone="indigo"
          icon={<ClockIcon className="w-4 h-4" />}
        />
      </StatsRow>

      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 space-y-4">
          <div className="bg-white rounded-2xl p-5 ring-1 ring-gray-100 shadow-sm">
            <h3 className="text-xs font-black uppercase text-gray-400 tracking-widest mb-4 flex items-center gap-2">
              <PlusCircleIcon className="h-4 w-4 text-emerald-600" /> Ingresos /
              Egresos
            </h3>
            <div className="space-y-3">
              <input
                type="number"
                placeholder="Monto $"
                className="w-full bg-gray-50 ring-2 ring-gray-100 rounded-xl p-3 font-black outline-none focus:ring-emerald-500"
                value={movementAmount || ""}
                onChange={(e) => setMovementAmount(Number(e.target.value))}
              />
              <input
                type="text"
                placeholder="Motivo"
                className="w-full bg-gray-50 ring-2 ring-gray-100 rounded-xl p-3 font-bold text-sm outline-none focus:ring-emerald-500"
                value={movementReason}
                onChange={(e) => setMovementReason(e.target.value)}
              />
              <input
                type="text"
                placeholder="N° Comprobante / Referencia (opcional)"
                className="w-full bg-gray-50 ring-2 ring-gray-100 rounded-xl p-3 font-medium text-sm outline-none focus:ring-emerald-500"
                value={movementReference}
                onChange={(e) => setMovementReference(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleMovement("IN")}
                  className="bg-emerald-50 text-emerald-700 font-black py-3 rounded-xl hover:bg-emerald-500 hover:text-white transition-all ring-1 ring-emerald-100 flex items-center justify-center gap-2 text-xs uppercase tracking-widest min-h-[44px]"
                >
                  <ArrowTrendingUpIcon className="h-4 w-4" /> Ingreso
                </button>
                <button
                  onClick={() => handleMovement("OUT")}
                  className="bg-rose-50 text-rose-700 font-black py-3 rounded-xl hover:bg-rose-500 hover:text-white transition-all ring-1 ring-rose-100 flex items-center justify-center gap-2 text-xs uppercase tracking-widest min-h-[44px]"
                >
                  <ArrowTrendingDownIcon className="h-4 w-4" /> Egreso
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 ring-1 ring-gray-100 shadow-sm">
            <h3 className="text-xs font-black uppercase text-gray-400 tracking-widest mb-4 flex items-center gap-2">
              <LockClosedIcon className="h-4 w-4" /> Cierre de turno
            </h3>
            <p className="text-xs text-gray-500 mb-3">
              Monto total en efectivo contado físicamente:
            </p>
            <input
              type="number"
              className="w-full bg-gray-900 ring-2 ring-gray-800 rounded-xl p-4 text-xl font-black text-emerald-400 outline-none mb-3"
              value={actualCash || ""}
              onChange={(e) => setActualCash(Number(e.target.value))}
              placeholder="0"
            />
            {actualCash > 0 && (
              <div
                className={`p-3 rounded-xl mb-3 text-center ${
                  actualCash >= expectedCash
                    ? "bg-emerald-50 ring-1 ring-emerald-200"
                    : "bg-rose-50 ring-1 ring-rose-200"
                }`}
              >
                <span className="text-xs font-bold text-gray-500">
                  Diferencia:{" "}
                </span>
                <span
                  className={`text-lg font-black ${
                    actualCash >= expectedCash
                      ? "text-emerald-700"
                      : "text-rose-700"
                  }`}
                >
                  {CLP(actualCash - expectedCash)}
                </span>
              </div>
            )}
            <OlivoButton
              fullWidth
              size="lg"
              onClick={handleCloseShift}
              className="bg-gray-900 text-white hover:bg-black uppercase tracking-widest text-xs"
            >
              Finalizar y cerrar caja
            </OlivoButton>
          </div>
        </div>

        <div className="w-full lg:w-[380px] space-y-4">
          <div className="bg-white rounded-2xl p-5 ring-1 ring-gray-100 shadow-sm">
            <h3 className="text-xs font-black uppercase text-gray-900 tracking-widest mb-3 flex items-center gap-2">
              <BanknotesIcon className="h-4 w-4 text-emerald-600" /> Ventas del
              turno ({shiftSales.length})
            </h3>
            {shiftSales.length === 0 ? (
              <EmptyState
                icon={<BanknotesIcon className="h-5 w-5" />}
                title="Sin ventas aún"
              />
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {shiftSales.map((sale) => (
                  <div
                    key={sale.id}
                    className="flex justify-between items-center p-3 bg-gray-50 rounded-xl"
                  >
                    <div>
                      <span className="text-xs font-bold text-gray-700">
                        Venta #{sale.id}
                      </span>
                      <p className="text-[10px] text-gray-400">
                        {new Date(sale.ts).toLocaleTimeString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-black text-emerald-700">
                        {CLP(Number(sale.total))}
                      </span>
                      <p className="text-[10px] text-gray-400 capitalize">
                        {sale.payment_method}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl p-5 ring-1 ring-gray-100 shadow-sm">
            <h3 className="text-xs font-black uppercase text-gray-900 tracking-widest mb-3 flex items-center gap-2">
              <ClockIcon className="h-4 w-4" /> Movimientos ({movements.length})
            </h3>
            {movements.length === 0 ? (
              <EmptyState
                icon={<ClockIcon className="h-5 w-5" />}
                title="Sin movimientos"
              />
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {movements.map((mov) => (
                  <div
                    key={mov.id}
                    className={`flex justify-between items-center p-3 rounded-xl ${
                      mov.type === "IN" ? "bg-emerald-50" : "bg-rose-50"
                    }`}
                  >
                    <div>
                      <span className="text-xs font-bold text-gray-700">
                        {mov.reason ||
                          (mov.type === "IN" ? "Ingreso" : "Egreso")}
                      </span>
                      <p className="text-[10px] text-gray-400">
                        {new Date(mov.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                    <span
                      className={`text-sm font-black ${
                        mov.type === "IN"
                          ? "text-emerald-700"
                          : "text-rose-700"
                      }`}
                    >
                      {mov.type === "IN" ? "+" : "−"}
                      {CLP(Number(mov.amount))}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
