"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeftIcon,
  SparklesIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  CalculatorIcon,
  DocumentPlusIcon,
  TruckIcon,
} from "@heroicons/react/24/outline";
import Button from "@/components/ui/Button";
import { useToast } from "@/contexts/ToastContext";

type Suggestion = {
  barcode: string;
  product_id: number;
  name: string;
  category: string | null;
  stock: number;
  reorder_threshold: number;
  units_sold: number;
  velocity_daily: number;
  days_of_cover: number | null;
  supplier_id: string | null;
  supplier_name: string | null;
  unit_cost: number | null;
  pack_size: number | null;
  default_reorder_qty: number | null;
  suggested_qty: number;
  estimated_cost: number;
};

type SupplierBucket = {
  supplier_id: string | null;
  supplier_name: string | null;
  items: Suggestion[];
  items_count: number;
  estimated_total: number;
};

type SuggestionsResponse = {
  params: { windowDays: number; coverageDays: number; safetyDays: number; onlyWithSupplier: boolean };
  total_items: number;
  estimated_total: number;
  suppliers: SupplierBucket[];
  generated_at: string;
};

type DraftResult = {
  ok: boolean;
  params: { windowDays: number; coverageDays: number; safetyDays: number };
  result: {
    orders_created: number;
    items_created: number;
    total_amount: number;
    orders: Array<{
      order_id: string;
      supplier_id: string;
      supplier_name: string;
      items: number;
      total: number;
    }>;
  };
};

const CLP = (n: number) =>
  n.toLocaleString("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });

export default function ReorderSuggestionsPage() {
  const { showToast } = useToast();

  const [windowDays, setWindowDays] = useState(30);
  const [coverageDays, setCoverageDays] = useState(14);
  const [safetyDays, setSafetyDays] = useState(3);
  const [onlyWithSupplier, setOnlyWithSupplier] = useState(true);

  const [data, setData] = useState<SuggestionsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [lastDraft, setLastDraft] = useState<DraftResult | null>(null);

  const fetchSuggestions = useCallback(async () => {
    setLoading(true);
    setLastDraft(null);
    try {
      const params = new URLSearchParams({
        window: String(windowDays),
        coverage: String(coverageDays),
        safety: String(safetyDays),
        onlyWithSupplier: onlyWithSupplier ? "1" : "0",
      });
      const res = await fetch(`/api/admin/replenishment/suggestions?${params}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Error calculando sugerencias");
      }
      setData(await res.json());
    } catch (e: any) {
      showToast(e.message || "Error", "error");
    } finally {
      setLoading(false);
    }
  }, [windowDays, coverageDays, safetyDays, onlyWithSupplier, showToast]);

  const generateDrafts = async () => {
    if (!data || data.total_items === 0) return;
    if (!confirm(`Se crearán supplier_orders en estado "borrador" para ${withSupplierCount} ítems agrupados por proveedor. ¿Continuar?`)) return;

    setGenerating(true);
    try {
      const res = await fetch("/api/admin/replenishment/generate-drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ windowDays, coverageDays, safetyDays }),
      });
      const out = await res.json();
      if (!res.ok) throw new Error(out.error || "Error creando borradores");
      setLastDraft(out);
      showToast(
        `Creados ${out.result.orders_created} borradores con ${out.result.items_created} items`,
        "success"
      );
    } catch (e: any) {
      showToast(e.message || "Error creando borradores", "error");
    } finally {
      setGenerating(false);
    }
  };

  const noSupplierBucket = useMemo(
    () => data?.suppliers.find((s) => !s.supplier_id),
    [data]
  );

  const withSupplierCount = useMemo(() => {
    if (!data) return 0;
    return data.suppliers
      .filter((s) => s.supplier_id)
      .reduce((acc, s) => acc + s.items_count, 0);
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/reabastecimiento"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Reabastecimiento
        </Link>
      </div>

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900 flex items-center gap-2">
            <SparklesIcon className="h-6 w-6 text-emerald-500" />
            Reposición semi-automática
          </h1>
          <p className="text-sm text-gray-500 mt-1 max-w-2xl">
            Calcula la velocidad de venta (POS + web) y propone cantidades a
            pedir para cubrir <b>{coverageDays}d</b> de demanda más{" "}
            <b>{safetyDays}d</b> de safety stock, agrupado por proveedor primario.
          </p>
        </div>
        <Link
          href="/admin/proveedores/asignar"
          className="text-sm font-semibold text-emerald-700 hover:text-emerald-900 underline underline-offset-2"
        >
          Asignar proveedores a productos →
        </Link>
      </div>

      {/* Parámetros */}
      <div className="bg-white border rounded-2xl p-4 sm:p-6 grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
        <NumberField label="Ventana ventas (días)" value={windowDays} setValue={setWindowDays} min={7} max={180} />
        <NumberField label="Cobertura objetivo (días)" value={coverageDays} setValue={setCoverageDays} min={1} max={90} />
        <NumberField label="Safety stock (días)" value={safetyDays} setValue={setSafetyDays} min={0} max={30} />
        <label className="flex items-center gap-2 text-sm text-gray-700 self-center pt-5">
          <input
            type="checkbox"
            checked={onlyWithSupplier}
            onChange={(e) => setOnlyWithSupplier(e.target.checked)}
            className="rounded text-emerald-600 focus:ring-emerald-500"
          />
          Sólo con proveedor asignado
        </label>
        <div className="col-span-2 md:col-span-4 flex flex-wrap gap-2">
          <Button onClick={fetchSuggestions} disabled={loading}>
            <CalculatorIcon className="h-5 w-5 mr-2" />
            {loading ? "Calculando…" : "Calcular sugerencias"}
          </Button>
          {data && withSupplierCount > 0 && (
            <Button
              onClick={generateDrafts}
              disabled={generating}
              className="bg-emerald-700 hover:bg-emerald-800"
            >
              <DocumentPlusIcon className="h-5 w-5 mr-2" />
              {generating
                ? "Generando…"
                : `Crear borradores (${withSupplierCount} items)`}
            </Button>
          )}
        </div>
      </div>

      {/* Resumen / banner */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <SummaryCard label="Productos a pedir" value={data.total_items.toString()} color="emerald" />
          <SummaryCard label="Proveedores involucrados" value={data.suppliers.filter(s => s.supplier_id).length.toString()} color="blue" />
          <SummaryCard label="Costo estimado total" value={CLP(data.estimated_total)} color="amber" />
        </div>
      )}

      {/* Items sin proveedor (banner accionable) */}
      {noSupplierBucket && noSupplierBucket.items_count > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          <div className="text-sm flex-1">
            <div className="font-bold text-amber-900">
              {noSupplierBucket.items_count} productos necesitan reposición pero
              no tienen proveedor asignado.
            </div>
            <div className="text-amber-800/80 mt-1">
              No se podrán generar borradores para ellos hasta vincularlos.
            </div>
          </div>
          <Link
            href="/admin/proveedores/asignar"
            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold uppercase tracking-wider shrink-0"
          >
            Asignar
          </Link>
        </div>
      )}

      {/* Última generación de borradores */}
      {lastDraft && lastDraft.result.orders_created > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-emerald-900 font-bold">
              <CheckCircleIcon className="h-5 w-5" />
              {lastDraft.result.orders_created} borradores creados ·{" "}
              {lastDraft.result.items_created} items ·{" "}
              {CLP(lastDraft.result.total_amount)}
            </div>
            <Link
              href="/admin/pedidos-proveedor"
              className="text-xs font-bold uppercase tracking-wider text-emerald-700 hover:text-emerald-900"
            >
              Ver pedidos →
            </Link>
          </div>
          <div className="space-y-1 text-sm text-emerald-900/90">
            {lastDraft.result.orders.map((o) => (
              <div key={o.order_id} className="flex justify-between border-t border-emerald-200 pt-1">
                <Link href={`/admin/pedidos-proveedor/${o.order_id}`} className="hover:underline">
                  {o.supplier_name} ({o.items} items)
                </Link>
                <span className="font-bold">{CLP(o.total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resultado por proveedor */}
      {data && data.suppliers.filter((s) => s.supplier_id).length === 0 && !loading && (
        <div className="bg-white border rounded-2xl p-10 text-center text-sm text-gray-500">
          {onlyWithSupplier && data.total_items === 0 && noSupplierBucket
            ? "Hay productos a reponer pero ninguno tiene proveedor asignado."
            : "Ningún producto necesita reposición con estos parámetros."}
        </div>
      )}

      {data?.suppliers
        .filter((s) => s.supplier_id)
        .map((bucket) => (
          <SupplierBucketCard key={bucket.supplier_id} bucket={bucket} />
        ))}
    </div>
  );
}

function NumberField({
  label, value, setValue, min, max,
}: { label: string; value: number; setValue: (v: number) => void; min: number; max: number }) {
  return (
    <div>
      <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-600 mb-1">
        {label}
      </label>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n)) setValue(Math.min(max, Math.max(min, Math.floor(n))));
        }}
        className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
      />
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: string; color: "emerald" | "blue" | "amber" }) {
  const colors = {
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
  } as const;
  return (
    <div className={`${colors[color]} border rounded-xl p-4`}>
      <div className="text-[11px] font-bold uppercase tracking-wider opacity-70">{label}</div>
      <div className="text-2xl font-black mt-1">{value}</div>
    </div>
  );
}

function SupplierBucketCard({ bucket }: { bucket: SupplierBucket }) {
  return (
    <div className="bg-white border rounded-2xl overflow-hidden">
      <div className="px-4 py-3 flex items-center justify-between bg-gray-50 border-b">
        <div className="flex items-center gap-2 min-w-0">
          <TruckIcon className="h-4 w-4 text-gray-400 shrink-0" />
          <div className="min-w-0">
            <div className="font-bold text-gray-900 truncate">
              {bucket.supplier_name || "Sin proveedor"}
            </div>
            <div className="text-[11px] text-gray-500">
              {bucket.items_count} items
            </div>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
            Estimado
          </div>
          <div className="font-black text-gray-900">{CLP(bucket.estimated_total)}</div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-[11px] uppercase tracking-wider text-gray-500 bg-gray-50/50">
            <tr>
              <th className="text-left px-4 py-2">Producto</th>
              <th className="text-right px-2 py-2">Stock</th>
              <th className="text-right px-2 py-2">Vel/día</th>
              <th className="text-right px-2 py-2">Cobertura</th>
              <th className="text-right px-2 py-2">Pack</th>
              <th className="text-right px-2 py-2">Sugerido</th>
              <th className="text-right px-2 py-2">Costo unit</th>
              <th className="text-right px-4 py-2">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {bucket.items.map((it) => {
              const coverNum = it.days_of_cover ?? null;
              const coverColor =
                coverNum === null
                  ? "text-gray-400"
                  : coverNum < 3
                  ? "text-rose-600"
                  : coverNum < 7
                  ? "text-amber-600"
                  : "text-emerald-700";
              return (
                <tr key={it.barcode} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <div className="font-semibold text-gray-900 truncate max-w-[300px]">{it.name}</div>
                    <div className="text-[11px] text-gray-500 font-mono">{it.barcode}</div>
                  </td>
                  <td className={`text-right px-2 py-2 font-bold ${Number(it.stock) <= 0 ? "text-rose-600" : "text-gray-800"}`}>
                    {it.stock}
                  </td>
                  <td className="text-right px-2 py-2 text-gray-700">{Number(it.velocity_daily).toFixed(2)}</td>
                  <td className={`text-right px-2 py-2 font-bold ${coverColor}`}>
                    {coverNum === null ? "—" : `${coverNum}d`}
                  </td>
                  <td className="text-right px-2 py-2 text-gray-500">{it.pack_size ?? "—"}</td>
                  <td className="text-right px-2 py-2 font-black text-emerald-700">{it.suggested_qty}</td>
                  <td className="text-right px-2 py-2 text-gray-700">{it.unit_cost ? CLP(Number(it.unit_cost)) : "—"}</td>
                  <td className="text-right px-4 py-2 font-bold text-gray-900">{CLP(Number(it.estimated_cost))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
