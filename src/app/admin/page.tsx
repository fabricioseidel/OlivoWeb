"use client";

import { useMemo, useEffect, useState } from "react";
import { useProducts } from "@/contexts/ProductContext";
import {
  EyeIcon,
  ArrowTrendingUpIcon,
  CursorArrowRaysIcon,
  Squares2X2Icon,
  ArrowUpIcon,
  ArrowDownIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

interface LocalOrder {
  id: string; total?: number; productos?: number; items?: any[]; createdAt?: string; fecha?: string; estado?: string; customer?: string; email?: string;
}

export default function AdminDashboard() {
  const { products } = useProducts();
  const [orders, setOrders] = useState<LocalOrder[]>([]);
  const [lastSync, setLastSync] = useState<string>("");

  // Cargar pedidos desde localStorage
  const loadOrders = () => {
    try {
      const raw = localStorage.getItem('orders');
      if (!raw) { setOrders([]); return; }
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        setOrders(arr);
        setLastSync(new Date().toLocaleTimeString());
      }
    } catch { setOrders([]); }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    loadOrders();
    const onStorage = (e: StorageEvent) => { if (e.key === 'orders') loadOrders(); };
    window.addEventListener('storage', onStorage);
    const onFocus = () => loadOrders();
    window.addEventListener('focus', onFocus);
    return () => { window.removeEventListener('storage', onStorage); window.removeEventListener('focus', onFocus); };
  }, []);

  const metrics = useMemo(() => {
    const totalViews = products.reduce((sum, p) => sum + (p.viewCount || 0), 0);
    const totalOrderIntents = products.reduce((sum, p) => sum + (p.orderClicks || 0), 0);
    const lowStock = products.filter(p => p.stock > 0 && p.stock <= 5).length;
    const totalOrders = orders.length;
    const grossRevenue = orders.reduce((s, o) => s + (Number(o.total) || 0), 0);
    const itemsSold = orders.reduce((s, o) => s + (o.productos || (Array.isArray(o.items) ? o.items.reduce((acc, it) => acc + (Number(it.quantity)||0), 0) : 0)), 0);
    const avgOrder = totalOrders ? grossRevenue / totalOrders : 0;
    // Conversión basada en intentos de pedido -> pedidos confirmados
    const intentConversion = totalOrderIntents ? (totalOrders / totalOrderIntents) * 100 : 0;
    // Conversión de visitas (opcional) pedidos / vistas
    const viewConversion = totalViews ? (totalOrders / totalViews) * 100 : 0;
    return { totalViews, totalOrderIntents, lowStock, totalOrders, grossRevenue, itemsSold, avgOrder, intentConversion, viewConversion };
  }, [products, orders]);

  const topViewed = useMemo(() => {
    return [...products]
      .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
      .slice(0, 5);
  }, [products]);

  const topOrderIntents = useMemo(() => {
    return [...products]
      .sort((a, b) => (b.orderClicks || 0) - (a.orderClicks || 0))
      .slice(0, 5);
  }, [products]);

  const exportCSV = () => {
    const header = ["id","name","categories","price","priceOriginal","stock","viewCount","orderClicks"].join(",");
    const rows = products.map(p => [
      p.id,
      JSON.stringify(p.name),
      JSON.stringify(Array.isArray(p.categories) ? p.categories.join("|") : ""),
      p.price,
      p.priceOriginal ?? "",
      p.stock,
      p.viewCount ?? 0,
      p.orderClicks ?? 0,
    ].join(","));
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `productos-metricas.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Resumen general y estadísticas de la tienda
        </p>
      </div>

      {/* Tarjetas de estadísticas (dinámicas) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        <StatCard title="Pedidos" value={metrics.totalOrders} icon={<ArrowTrendingUpIcon className="h-6 w-6" />} bgColor="bg-indigo-600" helper="Pedidos confirmados" />
        <StatCard title="Ingresos" value={`$ ${metrics.grossRevenue.toFixed(2)}`} icon={<ArrowUpIcon className="h-6 w-6" />} bgColor="bg-green-600" helper="Suma de totales" />
        <StatCard title="Ticket medio" value={`$ ${metrics.avgOrder.toFixed(2)}`} icon={<ArrowDownIcon className="h-6 w-6" />} bgColor="bg-teal-600" helper="Ingresos / pedidos" />
        <StatCard title="Items vendidos" value={metrics.itemsSold} icon={<Squares2X2Icon className="h-6 w-6" />} bgColor="bg-fuchsia-600" helper="Suma cantidades" />
        <StatCard title="Vistas productos" value={metrics.totalViews} icon={<EyeIcon className="h-6 w-6" />} bgColor="bg-emerald-600" helper="Suma viewCount" />
        <StatCard title="Intentos pedido" value={metrics.totalOrderIntents} icon={<CursorArrowRaysIcon className="h-6 w-6" />} bgColor="bg-blue-600" helper="Clicks compra" />
        <StatCard title="Conv. intentos" value={`${metrics.intentConversion.toFixed(1)}%`} icon={<ArrowTrendingUpIcon className="h-6 w-6" />} bgColor="bg-amber-600" helper="Pedidos / intentos" />
        <StatCard title="Bajo stock" value={products.filter(p=>p.stock>0&&p.stock<=5).length} icon={<Squares2X2Icon className="h-6 w-6" />} bgColor="bg-rose-600" helper="<=5 unidades" />
      </div>

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-medium text-gray-900">Top productos</h2>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <button onClick={exportCSV} className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-500 font-medium">
            <ArrowPathIcon className="h-4 w-4" /> Exportar CSV
          </button>
          <button onClick={() => loadOrders()} className="text-sm text-gray-600 hover:text-gray-800">Refrescar pedidos</button>
          <span>Sync: {lastSync || '—'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
        <MetricTable
          title="Más vistos"
          rows={topViewed.map(p => ({
            id: p.id,
            nombre: p.name,
            categoria: Array.isArray(p.categories) ? p.categories.slice(0,2).join(', ') : '',
            valor: p.viewCount || 0,
            extra: p.orderClicks || 0,
          }))}
          headerValor="Vistas"
          headerExtra="Intentos"
        />
        <MetricTable
          title="Más intentos pedido"
          rows={topOrderIntents.map(p => ({
            id: p.id,
            nombre: p.name,
            categoria: Array.isArray(p.categories) ? p.categories.slice(0,2).join(', ') : '',
            valor: p.orderClicks || 0,
            extra: p.viewCount || 0,
          }))}
          headerValor="Intentos"
          headerExtra="Vistas"
        />
      </div>

  <div className="text-xs text-gray-400">* Datos locales: pedidos (localStorage) + métricas de productos. Conversión intentos = pedidos / intentos.</div>
    </div>
  );
}

interface StatCardProps { title: string; value: string | number; change?: number; isPositive?: boolean; icon: React.ReactNode; bgColor: string; helper?: string; }
function StatCard({ title, value, icon, bgColor, helper }: StatCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-5 flex items-start gap-4">
        <div className={`flex-shrink-0 rounded-md p-3 ${bgColor} text-white`}>{icon}</div>
        <div className="flex-1">
          <div className="text-sm font-medium text-gray-500 flex items-center gap-2">
            <span>{title}</span>
          </div>
          <div className="text-xl font-semibold text-gray-900 mt-1">{value}</div>
          {helper && <div className="text-xs text-gray-400 mt-1">{helper}</div>}
        </div>
      </div>
    </div>
  );
}

interface MetricTableProps { title: string; rows: { id: string; nombre: string; categoria: string; valor: number; extra: number }[]; headerValor: string; headerExtra: string; }
function MetricTable({ title, rows, headerValor, headerExtra }: MetricTableProps) {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <h3 className="text-sm font-medium text-gray-900">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoría</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{headerValor}</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{headerExtra}</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200 text-sm">
            {rows.map(r => (
              <tr key={r.id}>
                <td className="px-4 py-2 font-medium text-gray-900 line-clamp-1 max-w-[160px]">{r.nombre}</td>
                <td className="px-4 py-2 text-gray-500">{r.categoria}</td>
                <td className="px-4 py-2 text-gray-900">{r.valor}</td>
                <td className="px-4 py-2 text-gray-500">{r.extra}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-gray-400 text-xs" colSpan={4}>Sin datos todavía</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
