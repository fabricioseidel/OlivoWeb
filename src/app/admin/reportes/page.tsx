"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useBranch } from "@/contexts/BranchContext";
import {
  ChartBarIcon, CalendarIcon, BanknotesIcon, BuildingStorefrontIcon,
  ArrowPathIcon, ArrowDownTrayIcon, ClockIcon,
} from "@heroicons/react/24/outline";

type Method = "CASH" | "DEBIT" | "CREDIT" | "TRANSFER" | "WALLET" | "OTHER";

const METHOD_LABEL: Record<string, string> = {
  CASH: "Efectivo", DEBIT: "Débito", CREDIT: "Crédito",
  TRANSFER: "Transferencia", WALLET: "Billetera", OTHER: "Otro",
};

interface SalesReport {
  total: number; count: number;
  by_method: Record<string, number>;
  by_day: Array<{ date: string; total: number; count: number }>;
  by_branch: Array<{ branch_id: string | null; branch_name: string | null; total: number; count: number }>;
  top_products: Array<{ barcode: string; name: string; units: number; revenue: number }>;
}

interface ShiftRow {
  id: string; branch_name: string | null; started_at: string; ended_at: string | null;
  status: "OPEN" | "CLOSED"; difference: number | null;
  closed_by_method: Record<string, { expected: number; actual: number; difference: number }> | null;
  hours_open: number;
}

function isoToday(): string { return new Date().toISOString().slice(0, 10); }
function isoDaysAgo(n: number): string {
  const d = new Date(); d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export default function ReportesPage() {
  const { branches, currentBranch } = useBranch();
  const [from, setFrom] = useState(isoDaysAgo(7));
  const [to, setTo] = useState(isoToday());
  const [branchFilter, setBranchFilter] = useState<string>(""); // "" = todas
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<SalesReport | null>(null);
  const [shifts, setShifts] = useState<ShiftRow[]>([]);
  const [tab, setTab] = useState<"sales" | "shifts">("sales");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const fromIso = new Date(`${from}T00:00:00`).toISOString();
      const toIso   = new Date(`${to}T23:59:59.999`).toISOString();
      const branchParam = branchFilter || (currentBranch?.id ?? "");
      const branchQs = branchParam ? `&branchId=${branchParam}` : "";

      const [salesRes, shiftsRes] = await Promise.all([
        fetch(`/api/admin/reports/sales?from=${fromIso}&to=${toIso}${branchQs}`),
        fetch(`/api/admin/reports/shifts?from=${fromIso}&to=${toIso}${branchQs}&limit=50`),
      ]);
      if (salesRes.ok)  setReport((await salesRes.json()) as SalesReport);
      if (shiftsRes.ok) setShifts(((await shiftsRes.json()).shifts as ShiftRow[]) ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [from, to, branchFilter, currentBranch?.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const maxDay = useMemo(() => Math.max(...(report?.by_day?.map(d => d.total) ?? [0]), 1), [report]);

  const exportCSV = () => {
    if (!report) return;
    const rows: string[][] = [
      ["Reporte de ventas", `${from} → ${to}`],
      [],
      ["Total general", `${report.total}`, `${report.count} ventas`],
      [],
      ["Método", "Total"],
      ...Object.entries(report.by_method).map(([m, v]) => [METHOD_LABEL[m] ?? m, String(v)]),
      [],
      ["Día", "Total", "Ventas"],
      ...report.by_day.map(d => [d.date, String(d.total), String(d.count)]),
      [],
      ["Sucursal", "Total", "Ventas"],
      ...report.by_branch.map(b => [b.branch_name ?? "(sin sucursal)", String(b.total), String(b.count)]),
      [],
      ["Top productos", "Unidades", "Ingresos"],
      ...report.top_products.map(p => [p.name, String(p.units), String(p.revenue)]),
    ];
    const csv = rows.map(r => r.map(c => `"${(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `reporte-ventas-${from}-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-4">
      <header className="flex flex-col sm:flex-row sm:items-end gap-3 justify-between">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-widest flex items-center gap-2">
            <ChartBarIcon className="h-6 w-6 text-emerald-600" /> Reportes
          </h1>
          <p className="text-xs text-gray-500 mt-1">Ventas y turnos de caja agrupados por método, día y sucursal.</p>
        </div>
        <button onClick={exportCSV} disabled={!report}
          className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 rounded-xl text-xs font-black uppercase tracking-widest disabled:opacity-30">
          <ArrowDownTrayIcon className="h-4 w-4" /> Exportar CSV
        </button>
      </header>

      {/* Filtros */}
      <div className="bg-white border border-gray-200 rounded-2xl p-3 flex flex-wrap gap-2 items-end">
        <label className="flex flex-col text-[10px] font-black uppercase tracking-widest text-gray-500">
          Desde
          <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            className="bg-white border border-gray-200 rounded-xl p-2 text-gray-900 text-sm mt-1" />
        </label>
        <label className="flex flex-col text-[10px] font-black uppercase tracking-widest text-gray-500">
          Hasta
          <input type="date" value={to} onChange={e => setTo(e.target.value)}
            className="bg-white border border-gray-200 rounded-xl p-2 text-gray-900 text-sm mt-1" />
        </label>
        <label className="flex flex-col text-[10px] font-black uppercase tracking-widest text-gray-500">
          Sucursal
          <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)}
            className="bg-white border border-gray-200 rounded-xl p-2 text-gray-900 text-sm mt-1">
            <option value="">Todas</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </label>
        <div className="flex gap-1 ml-auto">
          {[
            { label: "Hoy", days: 0 },
            { label: "7d", days: 7 },
            { label: "30d", days: 30 },
            { label: "90d", days: 90 },
          ].map(p => (
            <button key={p.label}
              onClick={() => { setFrom(isoDaysAgo(p.days)); setTo(isoToday()); }}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-700">
              {p.label}
            </button>
          ))}
          <button onClick={fetchData} disabled={loading}
            className="px-3 py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 rounded-xl">
            <ArrowPathIcon className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl border border-gray-200 w-fit">
        {(["sales", "shifts"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              tab === t ? "bg-emerald-500 text-black" : "text-gray-500 hover:text-gray-900"
            }`}>
            {t === "sales" ? "Ventas" : "Turnos"}
          </button>
        ))}
      </div>

      {tab === "sales" && report && (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard label="Total" value={`$ ${report.total.toLocaleString()}`} sub={`${report.count} ventas`} icon={BanknotesIcon} />
            <KpiCard label="Ticket promedio" value={`$ ${report.count ? Math.round(report.total / report.count).toLocaleString() : 0}`} icon={ChartBarIcon} />
            <KpiCard label="Métodos activos" value={`${Object.keys(report.by_method).length}`} icon={BanknotesIcon} />
            <KpiCard label="Días con ventas" value={`${report.by_day.length}`} icon={CalendarIcon} />
          </div>

          {/* By Method */}
          <Section title="Por método de pago" icon={BanknotesIcon}>
            {Object.keys(report.by_method).length === 0 ? (
              <EmptyState />
            ) : (
              <div className="space-y-2">
                {Object.entries(report.by_method)
                  .sort(([, a], [, b]) => b - a)
                  .map(([method, total]) => {
                    const pct = (total / report.total) * 100;
                    return (
                      <div key={method} className="flex items-center gap-3">
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-700 w-24">{METHOD_LABEL[method] ?? method}</span>
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs font-black text-gray-900 w-28 text-right">$ {Number(total).toLocaleString()}</span>
                        <span className="text-[10px] text-gray-400 w-10 text-right">{pct.toFixed(0)}%</span>
                      </div>
                    );
                  })}
              </div>
            )}
          </Section>

          {/* By Day chart */}
          <Section title="Ventas por día" icon={CalendarIcon}>
            {report.by_day.length === 0 ? <EmptyState /> : (
              <div className="space-y-1.5">
                {report.by_day.map(d => (
                  <div key={d.date} className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-gray-700 w-24">{d.date}</span>
                    <div className="flex-1 h-5 bg-gray-200 rounded-md overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 flex items-center justify-end pr-2"
                        style={{ width: `${(d.total / maxDay) * 100}%` }}>
                        <span className="text-[9px] font-black text-black">${d.total.toLocaleString()}</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-gray-400 w-14 text-right">{d.count} ventas</span>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* By Branch */}
          <Section title="Por sucursal" icon={BuildingStorefrontIcon}>
            {report.by_branch.length === 0 ? <EmptyState /> : (
              <div className="space-y-2">
                {report.by_branch.map(b => (
                  <div key={b.branch_id ?? "none"} className="flex justify-between p-3 bg-white rounded-xl border border-gray-200">
                    <div>
                      <p className="text-xs font-black text-gray-900">{b.branch_name ?? "(sin sucursal)"}</p>
                      <p className="text-[10px] text-gray-400">{b.count} ventas</p>
                    </div>
                    <p className="text-base font-black text-emerald-600">$ {Number(b.total).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Top Products */}
          <Section title="Top 10 productos" icon={ChartBarIcon}>
            {report.top_products.length === 0 ? <EmptyState /> : (
              <div className="space-y-1.5">
                {report.top_products.map((p, idx) => (
                  <div key={p.barcode} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                    <span className="text-[10px] font-black text-emerald-600 w-6">#{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-900 truncate">{p.name}</p>
                      <p className="text-[10px] text-gray-400">{p.units} u.</p>
                    </div>
                    <p className="text-xs font-black text-emerald-600">$ {Number(p.revenue).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </>
      )}

      {tab === "shifts" && (
        <Section title="Historial de turnos" icon={ClockIcon}>
          {shifts.length === 0 ? <EmptyState /> : (
            <div className="space-y-2">
              {shifts.map(s => (
                <details key={s.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <summary className="p-3 cursor-pointer flex justify-between items-center hover:bg-gray-50">
                    <div className="min-w-0">
                      <p className="text-xs font-black text-gray-900">{new Date(s.started_at).toLocaleString()}</p>
                      <p className="text-[10px] text-gray-500">
                        {s.branch_name ?? "(sin sucursal)"} · {s.hours_open?.toFixed(1)}h ·
                        <span className={s.status === "OPEN" ? " text-yellow-400" : " text-emerald-600"}> {s.status}</span>
                      </p>
                    </div>
                    <span className={`text-sm font-black ${
                      s.difference === null ? "text-gray-500" :
                      s.difference === 0    ? "text-gray-700" :
                      s.difference > 0      ? "text-emerald-600" : "text-red-400"
                    }`}>
                      {s.difference !== null ? `${s.difference >= 0 ? "+" : ""}$ ${s.difference.toLocaleString()}` : "—"}
                    </span>
                  </summary>
                  {s.closed_by_method && (
                    <div className="p-3 pt-0 grid grid-cols-2 sm:grid-cols-3 gap-2 border-t border-gray-100">
                      {Object.entries(s.closed_by_method).map(([m, b]) => (
                        <div key={m} className="p-2 bg-gray-50 rounded-lg">
                          <p className="text-[9px] font-black uppercase tracking-widest text-gray-500">{METHOD_LABEL[m] ?? m}</p>
                          <p className="text-xs font-bold text-gray-900 mt-1">$ {b.actual.toLocaleString()}</p>
                          <p className="text-[10px] text-gray-400">Esperado: ${b.expected.toLocaleString()}</p>
                          <p className={`text-[10px] font-bold ${
                            b.difference === 0 ? "text-gray-500" :
                            b.difference > 0   ? "text-emerald-600" : "text-red-400"
                          }`}>
                            {b.difference >= 0 ? "+" : ""}$ {b.difference.toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </details>
              ))}
            </div>
          )}
        </Section>
      )}
    </div>
  );
}

function KpiCard({ label, value, sub, icon: Icon }: { label: string; value: string; sub?: string; icon: any }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-4 w-4 text-emerald-600" />
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">{label}</p>
      </div>
      <p className="text-xl font-black text-gray-900">{value}</p>
      {sub && <p className="text-[10px] text-gray-400">{sub}</p>}
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <section className="bg-white border border-gray-200 rounded-2xl p-4">
      <h2 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-700 mb-3">
        <Icon className="h-4 w-4" /> {title}
      </h2>
      {children}
    </section>
  );
}

function EmptyState() {
  return <p className="text-center text-gray-400 text-xs py-6">Sin datos en este rango.</p>;
}
