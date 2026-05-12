"use client";

import { useEffect, useState } from "react";
import { useProducts } from "@/contexts/ProductContext";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import dynamic from 'next/dynamic';
import { useToast } from "@/contexts/ToastContext";
import LiveReceptionBoard, { LiveOrder } from "@/components/admin/LiveReceptionBoard";

const AdminAnalytics = dynamic(() => import('@/components/admin/AdminAnalytics'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Cargando analytics...</div>,
});

export default function AdminDashboard() {
  const { products } = useProducts();
  const { showToast } = useToast();
  const [orders, setOrders] = useState<LiveOrder[]>([]);
  const [lastSync, setLastSync] = useState<string>("");
  const [viewMode, setViewMode] = useState<'reception' | 'analytics'>('reception');
  const [insights, setInsights] = useState<any[]>([]);
  const [posSales, setPosSales] = useState<any[]>([]);

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
            paymentMethod: o.payment_method || 'Desconocido',
          }));
          setOrders(prev => {
            const newPendingCount = mapped.filter((x: any) => x.estado === 'Pendiente' || x.estado === 'pending').length;
            const oldPendingCount = prev.filter((x: any) => x.estado === 'Pendiente' || x.estado === 'pending').length;
            if (newPendingCount > oldPendingCount) {
              try { new Audio('/notification.mp3').play().catch(() => {}); } catch {}
            }
            return mapped;
          });
          setLastSync(new Date().toLocaleTimeString());
        }
      }
    } catch (e) { console.error(e); }
  };

  const loadPosSales = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const res = await fetch(`/api/sales?startDate=${today.toISOString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.sales) setPosSales(data.sales);
      }
    } catch (e) { console.error(e); }
  };

  const exportCSV = () => {
    const header = ["id", "name", "categories", "price", "priceOriginal", "stock", "viewCount", "orderClicks"].join(",");
    const rows = products.map(p => [
      p.id, JSON.stringify(p.name),
      JSON.stringify(Array.isArray(p.categories) ? p.categories.join("|") : ""),
      p.price, p.priceOriginal ?? "", p.stock, p.viewCount ?? 0, p.orderClicks ?? 0,
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

  useEffect(() => {
    loadOrders();
    loadPosSales();
    const interval = setInterval(() => {
      loadOrders();
      loadPosSales();
    }, 30000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode]);

  useEffect(() => {
    if (viewMode === 'analytics') {
      fetch('/api/admin/ai-insights')
        .then(res => res.json())
        .then(data => { if (data.insights) setInsights(data.insights); })
        .catch(console.error);
    }
  }, [viewMode]);

  const handleUpdateOrderStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        showToast(`Pedido #${id.substring(0, 6)} ahora es ${newStatus}`, 'success');
        loadOrders();
      } else {
        showToast('Error al actualizar pedido', 'error');
      }
    } catch {
      showToast('Error de red al actualizar', 'error');
    }
  };

  return (
    <div className="-m-4 sm:-m-8">
      <div className="bg-emerald-950 p-8 sm:p-12 mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-emerald-500/10 rounded-full blur-[100px]" />
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-end sm:items-center gap-6">
          <div>
            <h1 className="text-4xl font-black text-white tracking-tight">Centro de Control</h1>
            <p className="mt-2 text-emerald-100/50 font-medium italic">Operaciones en tiempo real de Olivo Market</p>
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
              <button onClick={loadOrders} className="flex items-center gap-2 bg-gray-50 text-gray-600 px-4 py-2 rounded-xl text-xs font-black tracking-widest uppercase hover:bg-emerald-50 hover:text-emerald-700 transition-colors border border-gray-200">
                <ArrowPathIcon className="w-4 h-4" /> Forzar Scan
              </button>
            </div>
            <LiveReceptionBoard orders={orders as LiveOrder[]} onUpdateStatus={handleUpdateOrderStatus} />
          </div>
        ) : (
          <AdminAnalytics
            orders={orders}
            products={products}
            posSales={posSales}
            insights={insights}
            lastSync={lastSync}
            onRefresh={loadOrders}
            onExportCSV={exportCSV}
          />
        )}
      </div>
    </div>
  );
}
