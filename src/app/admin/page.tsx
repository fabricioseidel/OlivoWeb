"use client";

import { useEffect, useRef, useState } from "react";
import { useProducts } from "@/contexts/ProductContext";
import { ChartBarIcon } from "@heroicons/react/24/outline";
import dynamic from "next/dynamic";
import { useToast } from "@/contexts/ToastContext";
import LiveReceptionBoard, {
  LiveOrder,
} from "@/components/admin/LiveReceptionBoard";
import { useAlertaPedidos } from "@/hooks/useAlertaPedidos";
import { detectarNuevos, idsParaRecordar } from "@/lib/admin/pedidos-nuevos";
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
  const alerta = useAlertaPedidos();
  // Los ids ya vistos. En un ref y no en estado: cambiarlo no tiene que
  // repintar nada, y dentro de `loadOrders` hace falta el valor de ahora, no el
  // que había cuando se creó la función.
  const idsVistos = useRef<Set<string> | null>(null);

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
            shippingMethod: o.shipping_method || "",
            expressStatus: o.express_status || null,
            expressTrackingUrl: o.express_tracking_url || null,
            expressError: o.express_error || null,
          }));
          // La primera carga sólo siembra los ids: al abrir el panel no tiene
          // que sonar por los pedidos que ya estaban ahí.
          if (idsVistos.current === null) {
            idsVistos.current = idsParaRecordar(mapped);
          } else {
            const nuevos = detectarNuevos(idsVistos.current, mapped);
            idsVistos.current = idsParaRecordar(mapped);
            if (nuevos.length > 0) {
              const primero = nuevos[0];
              alerta.sonar(
                nuevos.length === 1 ? "Pedido nuevo" : `${nuevos.length} pedidos nuevos`,
                `${primero.customer || "Invitado"} · $${Number(
                  primero.total || 0
                ).toLocaleString("es-CL")}`
              );
              showToast(
                nuevos.length === 1
                  ? `Pedido nuevo de ${nuevos[0].customer || "Invitado"}`
                  : `Entraron ${nuevos.length} pedidos nuevos`,
                "success"
              );
            }
          }
          setOrders(mapped);
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

  const handleReintentarEntrega = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/orders/${id}/reintentar-entrega`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        showToast("Repartidor pedido. Uber ya tiene la entrega.", "success");
      } else {
        // El motivo de Uber tal cual: es lo que dice qué hay que arreglar.
        showToast(data?.error || "No se pudo pedir el repartidor", "error");
      }
    } catch {
      showToast("Error de red al pedir el repartidor", "error");
    } finally {
      loadOrders();
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
          icon={<ChartBarIcon className="w-6 h-6 text-brand-300" />}
          right={
            <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 ring-1 ring-white/15 text-brand-100 text-[10px] font-black uppercase tracking-widest">
              <span className="size-2 bg-brand-400 rounded-full animate-pulse shadow-[0_0_10px_2px_#10B981]" />
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
          {/* Sin la alerta encendida el panel hay que mirarlo: el aviso lo dice
              una vez, arriba de todo, en vez de esconderlo en la configuración. */}
          {!alerta.activada && (
            <div className="bg-amber-50 ring-1 ring-amber-200 rounded-2xl px-4 py-3 text-sm text-amber-900">
              La alerta sonora está apagada: los pedidos nuevos entran en
              silencio. Actívala con el botón de abajo — el navegador exige un
              toque tuyo para poder sonar.
            </div>
          )}
          <LiveReceptionBoard
            orders={orders as LiveOrder[]}
            onUpdateStatus={handleUpdateOrderStatus}
            alertaActivada={alerta.activada}
            onAlternarAlerta={alerta.alternar}
            onReintentarEntrega={handleReintentarEntrega}
            onRefrescar={loadOrders}
            ultimoSync={lastSync}
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
