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
  LightBulbIcon
} from "@heroicons/react/24/outline";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

import { useToast } from "@/contexts/ToastContext";
import LiveReceptionBoard, { LiveOrder } from "@/components/admin/LiveReceptionBoard";

// interface LocalOrder extends LiveOrder {}

export default function AdminDashboard() {
  const { products } = useProducts();
  const { showToast } = useToast();
  const [orders, setOrders] = useState<LiveOrder[]>([]);
  const [lastSync, setLastSync] = useState<string>("");
  const [viewMode, setViewMode] = useState<'reception' | 'analytics'>('reception');
  const [insights, setInsights] = useState<any[]>([]);

  // Cargar pedidos desde API
  const loadOrders = async () => {
    try {
      const res = await fetch('/api/admin/orders');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const mapped = data.map((o: any) => ({
            id: o.id,
            total: Number(o.total),
            productos: o.items_count,
            createdAt: o.created_at || o.date,
            fecha: o.created_at,
            estado: o.status,
            customer: o.shipping_address?.fullName || o.shipping_address?.name || o.user_id || 'Invitado',
            paymentStatus: o.payment_status || 'pending',
            paymentMethod: o.payment_method || 'Desconocido'
          }));
          
          // Sound notification check (optional, only if new pending order arrived and length increased)
          const newPendingCount = mapped.filter((x: any) => x.estado === 'Pendiente' || x.estado === 'pending').length;
          const oldPendingCount = orders.filter((x: any) => x.estado === 'Pendiente' || x.estado === 'pending').length;
          if (newPendingCount > oldPendingCount && viewMode === 'reception') {
             try { new Audio('/notification.mp3').play().catch(() => {}); } catch {}
          }

          setOrders(mapped);
          setLastSync(new Date().toLocaleTimeString());
        }
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    loadOrders();
    // Auto-refresh every 15 seconds
    const interval = setInterval(() => {
      loadOrders();
    }, 15000);
    return () => clearInterval(interval);
  }, [viewMode, orders.length]);

  useEffect(() => {
    if (viewMode === 'analytics') {
      fetch('/api/admin/ai-insights')
        .then(res => res.json())
        .then(data => {
           if (data.insights) setInsights(data.insights);
        })
        .catch(console.error);
    }
  }, [viewMode]);

  const handleUpdateOrderStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        showToast(`Pedido #${id.substring(0,6)} ahora es ${newStatus}`, 'success');
        loadOrders();
      } else {
        showToast('Error al actualizar pedido', 'error');
      }
    } catch (e) {
      showToast('Error de red al actualizar', 'error');
    }
  };

  const metrics = useMemo(() => {
    const totalViews = products.reduce((sum, p) => sum + (p.viewCount || 0), 0);
    const totalOrderIntents = products.reduce((sum, p) => sum + (p.orderClicks || 0), 0);
    const lowStock = products.filter(p => p.stock > 0 && p.stock <= 5).length;
    const totalOrders = orders.length;
    const grossRevenue = orders.reduce((s, o) => s + (Number(o.total) || 0), 0);
    const itemsSold = orders.reduce((s, o) => s + (o.productos || (Array.isArray(o.items) ? o.items.reduce((acc: number, it: any) => acc + (Number(it.quantity) || 0), 0) : 0)), 0);
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
    const header = ["id", "name", "categories", "price", "priceOriginal", "stock", "viewCount", "orderClicks"].join(",");
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

  const salesByDay = useMemo(() => {
    const grouped = orders.reduce((acc, o) => {
      const d = o.createdAt ? new Date(o.createdAt).toISOString().split('T')[0] : 'N/A';
      acc[d] = (acc[d] || 0) + (o.total || 0);
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, Ventas]) => ({ date, Ventas }));
  }, [orders]);

  const topCategories = useMemo(() => {
    const catMap: Record<string, number> = {};
    products.forEach(p => {
      if (p.categories && Array.isArray(p.categories)) {
        p.categories.forEach(c => {
          catMap[c] = (catMap[c] || 0) + 1;
        });
      }
    });
    return Object.entries(catMap)
      .map(([name, count]) => ({ name, Productos: count }))
      .sort((a, b) => b.Productos - a.Productos).slice(0, 5);
  }, [products]);

  const ordersByStatus = useMemo(() => {
    const statusMap: Record<string, number> = {};
    orders.forEach(o => {
      const s = o.estado || 'desconocido';
      statusMap[s] = (statusMap[s] || 0) + 1;
    });
    return Object.entries(statusMap).map(([name, value]) => ({ name, value }));
  }, [orders]);

  const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'];

  return (
    <div className="-m-4 sm:-m-8">
      {/* Header Premium Admin */}
      <div className="bg-emerald-950 p-8 sm:p-12 mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-emerald-500/10 rounded-full blur-[100px]" />
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-end sm:items-center gap-6">
            <div>
                <h1 className="text-4xl font-black text-white tracking-tight">Centro de Control</h1>
                <p className="mt-2 text-emerald-100/50 font-medium italic">
                    Operaciones en tiempo real de Olivo Market
                </p>
            </div>
            <div className="flex flex-col items-end gap-3">
              <div className="flex items-center gap-4 bg-white/5 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 shadow-xl">
                  <div className="size-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_2px_#10B981]" />
                  <span className="text-emerald-100/70 text-xs font-black uppercase tracking-widest">Sincronizado: {lastSync || '—'}</span>
              </div>
              <div className="bg-emerald-900/50 p-1 rounded-xl flex border border-emerald-800 backdrop-blur-sm">
                <button 
                  onClick={() => setViewMode('reception')}
                  className={`px-4 py-2 text-xs font-black tracking-widest uppercase rounded-lg transition-all ${viewMode === 'reception' ? 'bg-emerald-500 text-white shadow-lg' : 'text-emerald-300/50 hover:text-emerald-200 hover:bg-white/5'}`}
                >LIVE RECEPTION</button>
                <button 
                  onClick={() => setViewMode('analytics')}
                  className={`px-4 py-2 text-xs font-black tracking-widest uppercase rounded-lg transition-all ${viewMode === 'analytics' ? 'bg-emerald-500 text-white shadow-lg' : 'text-emerald-300/50 hover:text-emerald-200 hover:bg-white/5'}`}
                >ANALYTICS</button>
              </div>
            </div>
        </div>
      </div>

      <div className="px-8 pb-12">
        {viewMode === 'reception' ? (
          <div>
            <div className="flex items-center justify-between mt-2 mb-8 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
              <p className="text-sm font-bold text-gray-500 max-w-lg leading-relaxed">Arrastra o gestiona los pedidos locales. Las actualizaciones se aplicarán de forma instantánea a los clientes y repartidores.</p>
              <button onClick={() => loadOrders()} className="flex items-center gap-2 bg-gray-50 text-gray-600 px-4 py-2 rounded-xl text-xs font-black tracking-widest uppercase hover:bg-emerald-50 hover:text-emerald-700 transition-colors border border-gray-200">
                <ArrowPathIcon className="w-4 h-4" /> Forzar Scan
              </button>
            </div>
            <LiveReceptionBoard orders={orders as LiveOrder[]} onUpdateStatus={handleUpdateOrderStatus} />
          </div>
        ) : (
          <>
            {/* AI Insights Card */}
            {insights.length > 0 && (
              <div className="mb-8 p-6 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-[2rem] shadow-lg shadow-amber-900/5 animate-in slide-in-from-bottom-5">
                 <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/40">
                       <LightBulbIcon className="w-6 h-6" />
                    </div>
                    <h2 className="text-xl font-black text-amber-950 uppercase tracking-widest">IA Predictiva <span className="opacity-50 text-xs ml-2">BETA</span></h2>
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {insights.map((insight, idx) => (
                       <div key={idx} className="bg-white rounded-2xl p-4 border border-amber-100 flex gap-4 hover:shadow-md transition">
                          {insight.image ? (
                             <img src={insight.image} className="w-12 h-12 rounded-xl object-cover shrink-0" />
                          ) : (
                             <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 shrink-0">📦</div>
                          )}
                          <div className="flex-1 min-w-0">
                             <p className="text-xs font-bold text-gray-900 truncate mb-1">{insight.productName}</p>
                             <p className="text-[10px] text-gray-500 font-medium leading-snug break-words">{insight.message}</p>
                             <p className="text-[10px] text-amber-600 font-black mt-2 tracking-widest uppercase">{insight.actionMessage}</p>
                          </div>
                       </div>
                    ))}
                 </div>
              </div>
            )}
            
            {/* Tarjetas de estadísticas Premium */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-12">
            <StatCard title="Pedidos" value={metrics.totalOrders} icon={<ArrowTrendingUpIcon className="h-6 w-6" />} color="emerald" helper="Confirmados" />
            <StatCard title="Ingresos" value={`$ ${metrics.grossRevenue.toLocaleString('es-CL')}`} icon={<ArrowUpIcon className="h-6 w-6" />} color="blue" helper="Suma total ventas" />
            <StatCard title="Ticket Medio" value={`$ ${metrics.avgOrder.toLocaleString('es-CL')}`} icon={<ArrowDownIcon className="h-6 w-6" />} color="teal" helper="Promedio por pedido" />
            <StatCard title="Items Vendidos" value={metrics.itemsSold} icon={<Squares2X2Icon className="h-6 w-6" />} color="indigo" helper="Unidades totales" />
            <StatCard title="Vistas" value={metrics.totalViews} icon={<EyeIcon className="h-6 w-6" />} color="emerald" helper="Visitas a productos" />
            <StatCard title="Intentos" value={metrics.totalOrderIntents} icon={<CursorArrowRaysIcon className="h-6 w-6" />} color="blue" helper="Clicks en comprar" />
            <StatCard title="Conversión" value={`${metrics.intentConversion.toFixed(1)}%`} icon={<ArrowTrendingUpIcon className="h-6 w-6" />} color="amber" helper="Intentos vs Pedidos" />
            <StatCard title="Bajo Stock" value={metrics.lowStock} icon={<Squares2X2Icon className="h-6 w-6" />} color="rose" helper="Menos de 5 unids." />
        </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Gráfico de Ventas en el tiempo */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden p-6">
          <h3 className="text-sm font-medium text-gray-900 mb-4">Ventas Diarias</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesByDay}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                <YAxis tickFormatter={(val) => `$${val}`} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                <Tooltip formatter={(val: any) => [`$${Number(val).toFixed(2)}`, "Ventas"]} />
                <Line type="monotone" dataKey="Ventas" stroke="#10B981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico de Distribución de Categorías */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden p-6">
          <h3 className="text-sm font-medium text-gray-900 mb-4">Top 5 Categorías (Volumen de Productos)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topCategories} layout="vertical" margin={{ left: 40, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#374151', textAnchor: 'end' }} />
                <Tooltip />
                <Bar dataKey="Productos" fill="#3B82F6" radius={[0, 4, 4, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico de Distribución de Estados de Pedido */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden p-6 lg:col-span-2">
          <h3 className="text-sm font-medium text-gray-900 mb-4">Distribución de Estados de Pedidos Web</h3>
          <div className="h-64 flex items-center justify-center">
            {ordersByStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={ordersByStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent = 0 }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {ordersByStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: number | undefined) => [val || 0, 'Pedidos']} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-400 text-sm">No hay suficientes datos</p>
            )}
          </div>
        </div>
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
            categoria: Array.isArray(p.categories) ? p.categories.slice(0, 2).join(', ') : '',
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
            categoria: Array.isArray(p.categories) ? p.categories.slice(0, 2).join(', ') : '',
            valor: p.orderClicks || 0,
            extra: p.viewCount || 0,
          }))}
          headerValor="Intentos"
          headerExtra="Vistas"
        />
        </div>
      </>
      )}
      </div>
    </div>
  );
}

interface StatCardProps { 
    title: string; 
    value: string | number; 
    icon: React.ReactNode; 
    color: 'emerald' | 'blue' | 'indigo' | 'amber' | 'rose' | 'teal'; 
    helper?: string; 
}

function StatCard({ title, value, icon, color, helper }: StatCardProps) {
  const colorMap = {
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
    rose: "bg-rose-50 text-red-600 border-red-100",
    teal: "bg-teal-50 text-teal-600 border-teal-100",
  };

  const iconBgMap = {
    emerald: "bg-emerald-600 shadow-emerald-200",
    blue: "bg-blue-600 shadow-blue-200",
    indigo: "bg-indigo-600 shadow-indigo-200",
    amber: "bg-amber-600 shadow-amber-200",
    rose: "bg-rose-600 shadow-red-200",
    teal: "bg-teal-600 shadow-teal-200",
  };

  return (
    <div className={`p-6 bg-white rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-500 group relative overflow-hidden`}>
      <div className={`absolute top-0 right-0 w-24 h-24 ${colorMap[color].split(' ')[0]} rounded-full blur-3xl opacity-50 -mr-12 -mt-12 group-hover:opacity-100 transition-opacity`} />
      
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-4">
            <div className={`p-3 rounded-2xl ${iconBgMap[color]} text-white shadow-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-500`}>
                {icon}
            </div>
            {helper && <span className="text-[10px] font-black uppercase tracking-widest text-gray-300 italic">{helper}</span>}
        </div>
        <div>
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">{title}</h3>
          <p className="text-3xl font-black text-gray-900 tracking-tight">{value}</p>
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

      {/* Vista Móvil (Cards) */}
      <div className="md:hidden divide-y divide-gray-100">
        {rows.length === 0 ? (
          <div className="px-6 py-10 text-center text-gray-400 text-xs">Sin datos todavía</div>
        ) : (
          rows.map(r => (
            <div key={r.id} className="p-4 flex flex-col gap-2">
              <div className="flex justify-between items-start gap-2">
                <span className="text-sm font-bold text-gray-900 line-clamp-2 flex-1">{r.nombre}</span>
                <div className="flex flex-col items-end shrink-0">
                  <span className="text-xs font-black text-emerald-600">{r.valor}</span>
                  <span className="text-[10px] text-gray-400 uppercase font-bold">{headerValor}</span>
                </div>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium truncate max-w-[150px]">
                  {r.categoria || 'Sin categoría'}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-gray-400">{headerExtra}:</span>
                  <span className="text-[10px] font-bold text-gray-700">{r.extra}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Vista Desktop (Tabla) */}
      <div className="hidden md:block overflow-x-auto">
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
