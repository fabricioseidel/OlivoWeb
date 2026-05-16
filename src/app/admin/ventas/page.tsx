"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Image from "next/image";
import { createPortal } from "react-dom";
import {
  MagnifyingGlassIcon,
  CalendarIcon,
  CreditCardIcon,
  BanknotesIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  XMarkIcon,
  CurrencyDollarIcon,
  DocumentArrowUpIcon,
  BuildingStorefrontIcon,
  ArrowPathIcon,
  ReceiptPercentIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import { useToast } from "@/contexts/ToastContext";
import { useBranch } from "@/contexts/BranchContext";

type Method = "CASH" | "DEBIT" | "CREDIT" | "TRANSFER" | "WALLET" | "OTHER";

interface SalePayment {
  id: string;
  method: Method;
  amount: number;
  reference: string | null;
}
interface Sale {
  id: number;
  ts: string;
  total: number;
  payment_method: string;
  cash_received: number;
  change_given: number;
  discount: number;
  tax: number;
  notes: string | null;
  voided: boolean;
  device_id: string;
  client_sale_id: string;
  seller_id: string | null;
  seller_name: string | null;
  seller_email: string | null;
  branch_id: string | null;
  branch_name: string | null;
  transfer_receipt_uri: string | null;
  transfer_receipt_name: string | null;
  sale_payments: SalePayment[] | null;
}
interface SaleItem {
  id: number;
  sale_id: number;
  product_barcode: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  discount: number;
}

const METHOD_LABEL: Record<Method, string> = {
  CASH: "Efectivo", DEBIT: "Débito", CREDIT: "Crédito",
  TRANSFER: "Transferencia", WALLET: "Billetera", OTHER: "Otro",
};

const methodChipClass = (m: Method) => {
  switch (m) {
    case "CASH":     return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
    case "DEBIT":    return "bg-blue-500/10 text-blue-400 border-blue-500/30";
    case "CREDIT":   return "bg-violet-500/10 text-violet-400 border-violet-500/30";
    case "TRANSFER": return "bg-cyan-500/10 text-cyan-400 border-cyan-500/30";
    case "WALLET":   return "bg-amber-500/10 text-amber-400 border-amber-500/30";
    default:         return "bg-white/5 text-white/50 border-white/10";
  }
};

const fmt = (n: number) => `$ ${Number(n || 0).toLocaleString("es-CL")}`;
const fmtTime = (iso: string) => {
  const d = new Date(iso);
  return `${d.toLocaleDateString("es-CL")} ${d.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}`;
};

const isoLocal = (d: Date) => d.toISOString().slice(0, 10);
const presets = (key: "today" | "7d" | "30d" | "all") => {
  const today = new Date();
  if (key === "today") return { from: isoLocal(new Date(today.getFullYear(), today.getMonth(), today.getDate())), to: isoLocal(today) };
  if (key === "7d")    { const d = new Date(today); d.setDate(d.getDate() - 7); return { from: isoLocal(d), to: isoLocal(today) }; }
  if (key === "30d")   { const d = new Date(today); d.setDate(d.getDate() - 30); return { from: isoLocal(d), to: isoLocal(today) }; }
  return { from: "", to: "" };
};

export default function VentasPage() {
  const { showToast } = useToast();
  const { branches, currentBranch } = useBranch();

  const [sales, setSales] = useState<Sale[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Filters
  const [preset, setPreset] = useState<"today" | "7d" | "30d" | "all">("7d");
  const [from, setFrom] = useState(presets("7d").from);
  const [to, setTo]     = useState(presets("7d").to);
  const [method, setMethod]   = useState<"" | Method>("");
  const [branchId, setBranchId] = useState<string>(""); // "" = todas
  const [includeVoided, setIncludeVoided] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  useEffect(() => { setMounted(true); }, []);

  const applyPreset = (p: typeof preset) => {
    setPreset(p);
    const v = presets(p);
    setFrom(v.from); setTo(v.to);
    setPage(0);
  };

  const loadSales = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set("startDate", new Date(`${from}T00:00:00`).toISOString());
      if (to)   params.set("endDate",   new Date(`${to}T23:59:59.999`).toISOString());
      if (method)  params.set("method", method);
      if (branchId) params.set("branchId", branchId);
      if (includeVoided) params.set("includeVoided", "1");
      params.set("limit",  String(PAGE_SIZE));
      params.set("offset", String(page * PAGE_SIZE));

      const res = await fetch(`/api/sales?${params.toString()}`);
      if (!res.ok) throw new Error("Error fetching sales");
      const data = await res.json();
      setSales(data.sales ?? []);
      setTotal(data.total ?? 0);
    } catch (error) {
      showToast("Error al cargar ventas", "error");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [from, to, method, branchId, includeVoided, page, showToast]);

  useEffect(() => { loadSales(); }, [loadSales]);

  const loadSaleDetail = async (saleId: number) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/sales/${saleId}`);
      if (!res.ok) throw new Error("No se pudo cargar el detalle");
      const data = await res.json();
      setSaleItems(data.items ?? []);
    } catch {
      showToast("Error al cargar detalle", "error");
    } finally {
      setDetailLoading(false);
    }
  };

  const openSale = (sale: Sale) => {
    setSelectedSale(sale);
    setSaleItems([]);
    loadSaleDetail(sale.id);
  };

  const handleUploadReceipt = async (saleId: number, file: File) => {
    setUploadingReceipt(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/sales/${saleId}/upload-receipt`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al subir comprobante");
      showToast("Comprobante subido", "success");
      await loadSales();
      if (selectedSale) {
        const upd = await fetch(`/api/sales/${saleId}`).then(r => r.json());
        if (upd.sale) setSelectedSale(prev => prev ? { ...prev, transfer_receipt_uri: upd.sale.transfer_receipt_uri, transfer_receipt_name: upd.sale.transfer_receipt_name } : prev);
      }
    } catch (error: any) {
      showToast(error?.message || "Error al subir", "error");
    } finally {
      setUploadingReceipt(false);
    }
  };

  const pickFile = (saleId: number) => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = "image/*";
    input.onchange = e => {
      const f = (e.target as HTMLInputElement).files?.[0];
      if (f) handleUploadReceipt(saleId, f);
    };
    input.click();
  };

  const filteredSales = useMemo(() => {
    if (!searchTerm) return sales;
    const t = searchTerm.toLowerCase();
    return sales.filter(s =>
      String(s.id).includes(t) ||
      s.seller_name?.toLowerCase().includes(t) ||
      s.branch_name?.toLowerCase().includes(t) ||
      s.client_sale_id?.toLowerCase().includes(t) ||
      s.sale_payments?.some(p => METHOD_LABEL[p.method].toLowerCase().includes(t))
    );
  }, [sales, searchTerm]);

  const stats = useMemo(() => {
    const count = filteredSales.length;
    const revenue = filteredSales.reduce((a, s) => a + (s.voided ? 0 : s.total), 0);
    const avg = count > 0 ? revenue / count : 0;
    const byMethod: Record<string, number> = {};
    for (const s of filteredSales) {
      if (s.voided) continue;
      if (Array.isArray(s.sale_payments) && s.sale_payments.length) {
        for (const p of s.sale_payments) byMethod[p.method] = (byMethod[p.method] ?? 0) + Number(p.amount);
      } else {
        const m = (s.payment_method || "OTHER").toUpperCase();
        byMethod[m] = (byMethod[m] ?? 0) + Number(s.total);
      }
    }
    return { count, revenue, avg, byMethod };
  }, [filteredSales]);

  const exportCSV = () => {
    if (filteredSales.length === 0) { showToast("Sin datos a exportar", "error"); return; }
    const headers = ["ID", "Fecha", "Sucursal", "Vendedor", "Total", "Métodos", "Anulada", "Notas"];
    const rows = filteredSales.map(s => [
      s.id, fmtTime(s.ts), s.branch_name ?? "", s.seller_name ?? "",
      s.total, (s.sale_payments ?? []).map(p => `${p.method}:${p.amount}`).join("|") || s.payment_method,
      s.voided ? "Sí" : "No", (s.notes ?? "").replace(/[\r\n,]/g, " "),
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `ventas-${from || "all"}-${to || "all"}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-4">
      <header className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-end">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-widest flex items-center gap-2">
            <ReceiptPercentIcon className="h-6 w-6 text-emerald-400" /> Historial de Ventas
          </h1>
          <p className="text-xs text-white/40 mt-1">Transacciones con desglose de pagos y comprobantes.</p>
        </div>
        <button onClick={exportCSV}
          className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-500/20">
          <ArrowDownTrayIcon className="h-4 w-4" /> Exportar CSV
        </button>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Kpi label="Transacciones" value={stats.count.toLocaleString()} icon={CurrencyDollarIcon} />
        <Kpi label="Ingreso" value={fmt(stats.revenue)} icon={BanknotesIcon} />
        <Kpi label="Ticket medio" value={fmt(Math.round(stats.avg))} icon={CreditCardIcon} />
        <Kpi label="Métodos" value={String(Object.keys(stats.byMethod).length)} icon={CreditCardIcon} />
      </div>

      {/* Filters */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-3 flex flex-wrap gap-2 items-end">
        <div className="relative flex-1 min-w-[200px]">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
          <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar #id, vendedor, sucursal, método…"
            className="w-full bg-black border border-white/10 rounded-xl pl-9 pr-3 py-2 text-sm text-white outline-none focus:border-emerald-500" />
        </div>

        <FilterField label="Desde" icon={CalendarIcon}>
          <input type="date" value={from} onChange={e => { setFrom(e.target.value); setPreset("all"); setPage(0); }}
            className="bg-black border border-white/10 rounded-xl px-2 py-2 text-sm text-white" />
        </FilterField>
        <FilterField label="Hasta" icon={CalendarIcon}>
          <input type="date" value={to} onChange={e => { setTo(e.target.value); setPreset("all"); setPage(0); }}
            className="bg-black border border-white/10 rounded-xl px-2 py-2 text-sm text-white" />
        </FilterField>
        <FilterField label="Sucursal" icon={BuildingStorefrontIcon}>
          <select value={branchId} onChange={e => { setBranchId(e.target.value); setPage(0); }}
            className="bg-black border border-white/10 rounded-xl px-2 py-2 text-sm text-white">
            <option value="">Todas</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </FilterField>
        <FilterField label="Método" icon={CreditCardIcon}>
          <select value={method} onChange={e => { setMethod(e.target.value as any); setPage(0); }}
            className="bg-black border border-white/10 rounded-xl px-2 py-2 text-sm text-white">
            <option value="">Todos</option>
            {(Object.keys(METHOD_LABEL) as Method[]).map(m => (
              <option key={m} value={m}>{METHOD_LABEL[m]}</option>
            ))}
          </select>
        </FilterField>

        <div className="flex gap-1 ml-auto">
          {(["today", "7d", "30d", "all"] as const).map(p => (
            <button key={p} onClick={() => applyPreset(p)}
              className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors ${
                preset === p ? "bg-emerald-500 text-black" : "bg-white/5 text-white/50 hover:bg-white/10"
              }`}>
              {p === "today" ? "Hoy" : p === "7d" ? "7d" : p === "30d" ? "30d" : "Todas"}
            </button>
          ))}
          <label className="flex items-center gap-1 px-3 py-2 bg-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white/50 cursor-pointer">
            <input type="checkbox" checked={includeVoided} onChange={e => setIncludeVoided(e.target.checked)} className="accent-emerald-500" />
            Incluir anuladas
          </label>
          <button onClick={loadSales} className="px-3 py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl">
            <ArrowPathIcon className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Method distribution */}
      {Object.keys(stats.byMethod).length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Distribución por método</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats.byMethod).sort(([, a], [, b]) => b - a).map(([m, v]) => (
              <span key={m} className={`px-2.5 py-1 rounded-lg border text-[10px] font-black ${methodChipClass(m as Method)}`}>
                {METHOD_LABEL[m as Method] ?? m}: {fmt(v)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Sales list */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        {loading && (
          <div className="p-6 text-center text-white/40 text-xs font-black uppercase tracking-widest animate-pulse">Cargando…</div>
        )}
        {!loading && filteredSales.length === 0 && (
          <div className="p-10 text-center">
            <DocumentArrowUpIcon className="mx-auto h-10 w-10 text-white/20 mb-3" />
            <p className="text-sm font-bold text-white/40">Sin ventas en este rango</p>
            <p className="text-xs text-white/30 mt-1">Cambia los filtros o presets de fecha</p>
          </div>
        )}
        {!loading && filteredSales.length > 0 && (
          <ul className="divide-y divide-white/5">
            {filteredSales.map(sale => (
              <li key={sale.id}>
                <button onClick={() => openSale(sale)} className="w-full text-left p-3 hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-3">
                    {/* Left: id + meta */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-black text-white">#{sale.id}</span>
                        {sale.voided && (
                          <span className="px-1.5 py-0.5 bg-red-500/10 border border-red-500/30 text-red-400 text-[9px] font-black uppercase tracking-widest rounded-md">
                            Anulada
                          </span>
                        )}
                        {sale.branch_name && (
                          <span className="text-[10px] text-white/40 flex items-center gap-1">
                            <BuildingStorefrontIcon className="h-3 w-3" />{sale.branch_name}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-white/30 mt-0.5">
                        {fmtTime(sale.ts)} · {sale.seller_name ?? "Mostrador"}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {Array.isArray(sale.sale_payments) && sale.sale_payments.length > 0
                          ? sale.sale_payments.map(p => (
                              <span key={p.id} className={`px-2 py-0.5 rounded-md border text-[9px] font-black ${methodChipClass(p.method)}`}>
                                {METHOD_LABEL[p.method]} {fmt(p.amount)}
                              </span>
                            ))
                          : (
                            <span className="px-2 py-0.5 rounded-md border text-[9px] font-black bg-white/5 text-white/50 border-white/10">
                              {sale.payment_method}
                            </span>
                          )
                        }
                        {sale.payment_method?.toLowerCase().includes("transfer") && !sale.transfer_receipt_uri && (
                          <span className="px-2 py-0.5 rounded-md border text-[9px] font-black bg-yellow-500/10 text-yellow-400 border-yellow-500/30">
                            ⚠ Sin comprobante
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Right: total + action */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-base font-black ${sale.voided ? "line-through text-white/30" : "text-emerald-400"}`}>
                        {fmt(sale.total)}
                      </span>
                      <EyeIcon className="h-4 w-4 text-white/30" />
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Pagination */}
        {total > PAGE_SIZE && (
          <div className="p-3 border-t border-white/5 flex items-center justify-between text-xs">
            <span className="text-white/40">{page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} de {total}</span>
            <div className="flex gap-1">
              <button disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))}
                className="px-3 py-1.5 bg-white/5 rounded-lg text-white/60 disabled:opacity-30">← Ant.</button>
              <button disabled={(page + 1) * PAGE_SIZE >= total} onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 bg-white/5 rounded-lg text-white/60 disabled:opacity-30">Sig. →</button>
            </div>
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selectedSale && mounted && createPortal(
        <SaleDetailModal
          sale={selectedSale}
          items={saleItems}
          loading={detailLoading}
          uploading={uploadingReceipt}
          onClose={() => setSelectedSale(null)}
          onPickReceipt={pickFile}
        />,
        document.body
      )}
    </div>
  );
}

// ─── Subcomponents ─────────────────────────────────────────────────────────

function Kpi({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-4 w-4 text-emerald-400" />
        <p className="text-[10px] font-black uppercase tracking-widest text-white/40">{label}</p>
      </div>
      <p className="text-xl font-black text-white">{value}</p>
    </div>
  );
}

function FilterField({ label, icon: Icon, children }: { label: string; icon: any; children: React.ReactNode }) {
  return (
    <label className="flex flex-col text-[10px] font-black uppercase tracking-widest text-white/40">
      <span className="flex items-center gap-1 mb-1"><Icon className="h-3 w-3" />{label}</span>
      {children}
    </label>
  );
}

function SaleDetailModal({
  sale, items, loading, uploading, onClose, onPickReceipt,
}: {
  sale: Sale; items: SaleItem[]; loading: boolean; uploading: boolean;
  onClose: () => void; onPickReceipt: (id: number) => void;
}) {
  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div onClick={e => e.stopPropagation()}
        className="relative bg-zinc-950 border border-white/10 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <header className="p-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-white">Venta #{sale.id}</h3>
              {sale.voided && (
                <span className="px-2 py-0.5 bg-red-500/10 border border-red-500/30 text-red-400 text-[9px] font-black uppercase tracking-widest rounded-md">
                  Anulada
                </span>
              )}
            </div>
            <p className="text-[10px] text-white/40 mt-0.5">
              {fmtTime(sale.ts)} · {sale.branch_name ?? "Sin sucursal"} · {sale.seller_name ?? "Mostrador"}
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-white/40 hover:bg-white/10 rounded-xl">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </header>

        {/* Body */}
        <div className="p-4 overflow-y-auto flex-1 space-y-3">
          {/* Payments */}
          <section className="bg-white/5 border border-white/10 rounded-xl p-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Pagos</p>
            {Array.isArray(sale.sale_payments) && sale.sale_payments.length > 0 ? (
              <div className="space-y-1">
                {sale.sale_payments.map(p => (
                  <div key={p.id} className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded-md border text-[10px] font-black ${methodChipClass(p.method)}`}>
                      {METHOD_LABEL[p.method]}
                      {p.reference && <span className="ml-1 font-normal text-white/40">· {p.reference}</span>}
                    </span>
                    <span className="text-sm font-black text-emerald-400">{fmt(p.amount)}</span>
                  </div>
                ))}
                <div className="border-t border-white/10 pt-2 mt-2 flex justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/50">Total</span>
                  <span className="text-lg font-black text-white">{fmt(sale.total)}</span>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-center">
                <span className="text-sm text-white/60 capitalize">{sale.payment_method}</span>
                <span className="text-lg font-black text-emerald-400">{fmt(sale.total)}</span>
              </div>
            )}
            {(sale.cash_received > 0 || sale.change_given > 0) && (
              <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-white/5">
                <Stat label="Efectivo recibido" value={fmt(sale.cash_received)} />
                <Stat label="Vuelto" value={fmt(sale.change_given)} />
              </div>
            )}
          </section>

          {/* Receipt for transfers */}
          {(sale.payment_method?.toLowerCase().includes("transfer") || sale.sale_payments?.some(p => p.method === "TRANSFER")) && (
            <section className="bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-cyan-400">Comprobante de transferencia</p>
                <button onClick={() => onPickReceipt(sale.id)} disabled={uploading}
                  className="px-2.5 py-1 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 rounded-lg text-[9px] font-black uppercase tracking-widest disabled:opacity-50">
                  {uploading ? "Subiendo…" : sale.transfer_receipt_uri ? "Reemplazar" : "Subir"}
                </button>
              </div>
              {sale.transfer_receipt_uri ? (
                <a href={sale.transfer_receipt_uri} target="_blank" rel="noopener noreferrer"
                  className="block relative w-full h-48 rounded-lg overflow-hidden border border-white/10 bg-black">
                  <Image src={sale.transfer_receipt_uri} alt="Comprobante" fill className="object-contain" />
                </a>
              ) : (
                <p className="text-xs text-white/40 text-center py-3">Sin comprobante subido</p>
              )}
            </section>
          )}

          {/* Items */}
          <section className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/40 p-3 pb-2">Artículos</p>
            {loading ? (
              <div className="p-6 text-center text-white/30 text-xs">Cargando detalle…</div>
            ) : items.length === 0 ? (
              <div className="p-6 text-center text-white/30 text-xs">Sin detalle de items registrado</div>
            ) : (
              <ul className="divide-y divide-white/5">
                {items.map(it => (
                  <li key={it.id} className="px-3 py-2 flex items-center gap-3">
                    <span className="text-xs font-black text-emerald-400 w-10 shrink-0">×{it.quantity}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{it.product_name}</p>
                      <p className="text-[10px] text-white/30 font-mono">{it.product_barcode}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-white/40">{fmt(it.unit_price)} c/u</p>
                      <p className="text-sm font-black text-white">{fmt(it.subtotal)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Extra */}
          {(sale.discount > 0 || sale.tax > 0 || sale.notes) && (
            <section className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-1">
              {sale.discount > 0 && <Stat label="Descuento" value={`- ${fmt(sale.discount)}`} />}
              {sale.tax > 0 && <Stat label="Impuesto" value={fmt(sale.tax)} />}
              {sale.notes && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Notas</p>
                  <p className="text-xs text-white/70 italic mt-1">{sale.notes}</p>
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-white/40">{label}</span>
      <span className="text-white font-bold">{value}</span>
    </div>
  );
}
