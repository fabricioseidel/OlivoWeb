"use client";

import { useEffect, useState } from "react";
import { useProducts } from "@/contexts/ProductContext";
import {
  ArrowPathIcon,
  ChartBarIcon,
  BoltIcon,
} from "@heroicons/react/24/outline";
import dynamic from "next/dynamic";
import { useToast } from "@/contexts/ToastContext";
import LiveReceptionBoard, {
  LiveOrder,
} from "@/components/admin/LiveReceptionBoard";
import {
  PageShell,
  HeroHeader,
  TabNav,
  type Tab,
} from "@/components/admin/shell";

const AdminAnalytics = dynamic(
  () => import("@/components/admin/AdminAnalytics"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        Cargando analytics...
      </div>
    ),
  }
);

type ViewMode = "reception" | "analytics";

export default function AdminDashboard() {
  const { products } = useProducts();
  const { showToast } = useToast();
  const [orders, setOrders] = useState<LiveOrder[]>([]);
  const [lastSync, setLastSync] = useState<string>("");
  const [viewMode, setViewMode] = useState<ViewMode>("reception");
  const [insights, setInsights] = useState<any[]>([]);
  const [posSales, setPosSales] = useState<any[]>([]);

  const loadOrders = async () => {
    try {
      const res = await fetch("/api/admin/orders");
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
            customer:
              o.shipping_address?.fullName ||
              o.shipping_address?.name ||
              o.user_id ||
              "Invitado",
            paymentStatus: o.payment_status || "pending",
            paymentMethod: o.payment_method || "Desconocido",
          }));
          setOrders((prev) => {
            const newPendingCount = mapped.filter(
              (x: any) => x.estado === "Pendiente" || x.estado === "pending"
            ).length;
            const oldPendingCount = prev.filter(
              (x: any) => x.estado === "Pendiente" || x.estado === "pending"
            ).length;
            if (newPendingCount > oldPendingCount) {
              try {
                new Audio("/notification.mp3").play().catch(() => {});
              } catch {}
            }
            return mapped;
          });
          setLastSync(new Date().toLocaleTimeString());
        }
      }
    } catch (e) {
      console.error(e);
    }
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
    } catch (e) {
      console.error(e);
    }
  };

  const exportCSV = () => {
    const header = [
      "id",
      "name",
      "categories",
      "price",
      "priceOriginal",
      "stock",
      "viewCount",
      "orderClicks",
    ].join(",");
    const rows = products.map((p) =>
      [
        p.id,
        JSON.stringify(p.name),
        JSON.stringify(
          Array.isArray(p.categories) ? p.categories.join("|") : ""
        ),
        p.price,
        p.priceOriginal ?? "",
        p.stock,
        p.viewCount ?? 0,
        p.orderClicks ?? 0,
      ].join(",")
    );
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
  }, [viewMode]);

  useEffect(() => {
    if (viewMode === "analytics") {
      fetch("/api/admin/ai-insights")
        .then((res) => res.json())
        .then((data) => {
          if (data.insights) setInsights(data.insights);
        })
        .catch(console.error);
    }
  }, [viewMode]);

  const handleUpdateOrderStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        showToast(
          `Pedido #${id.substring(0, 6)} ahora es ${newStatus}`,
          "success"
        );
        loadOrders();
      } else {
        showToast("Error al actualizar pedido", "error");
      }
    } catch {
      showToast("Error de red al actualizar", "error");
    }
  };

  const tabs: Tab[] = [
    { key: "reception", label: "Live Reception" },
    { key: "analytics", label: "Analytics" },
  ];

  return (
    <PageShell
      hero={
        <HeroHeader
          kicker="Resumen"
          title="Centro de Control"
          subtitle="Operaciones en tiempo real de Olivo Market"
          icon={<ChartBarIcon className="w-6 h-6 text-emerald-300" />}
          right={
            <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 ring-1 ring-white/15 text-emerald-100 text-[10px] font-black uppercase tracking-widest">
              <span className="size-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_10px_2px_#10B981]" />
              Sync: {lastSync || "—"}
            </div>
          }
        />
      }
    >
      <TabNav
        tabs={tabs}
        value={viewMode}
        onChange={(k) => setViewMode(k as ViewMode)}
      />

      {viewMode === "reception" ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 bg-white p-4 rounded-2xl ring-1 ring-gray-200 shadow-sm flex-wrap">
            <p className="text-sm font-bold text-gray-500 max-w-lg leading-relaxed">
              Gestioná los pedidos locales en vivo. Las actualizaciones se
              aplican de forma instantánea a clientes y repartidores.
            </p>
            <button
              onClick={loadOrders}
              className="inline-flex items-center gap-2 bg-gray-50 text-gray-600 px-4 py-2 rounded-xl text-xs font-black tracking-widest uppercase hover:bg-emerald-50 hover:text-emerald-700 transition-colors ring-1 ring-gray-200 min-h-[44px]"
            >
              <ArrowPathIcon className="w-4 h-4" />
              <BoltIcon className="w-3 h-3" />
              Forzar Scan
            </button>
          </div>
          <LiveReceptionBoard
            orders={orders as LiveOrder[]}
            onUpdateStatus={handleUpdateOrderStatus}
          />
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
    </PageShell>
  );
}
