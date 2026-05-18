"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowPathIcon,
  ShoppingCartIcon,
  SparklesIcon,
  ExclamationTriangleIcon,
  ArchiveBoxArrowDownIcon,
  CurrencyDollarIcon,
  BoltIcon,
} from "@heroicons/react/24/outline";

import {
  PageShell,
  HeroHeader,
  StatsRow,
  StatsCard,
  TabNav,
  type Tab,
} from "@/components/admin/shell";
import { useToast } from "@/contexts/ToastContext";
import {
  PedidosPanel,
  StockBajoPanel,
  SugerenciasPanel,
  RecepcionPanel,
  type SupplierOrder,
  type ReplenishmentResponse,
} from "@/components/admin/reabastecimiento";

type TabId = "pedidos" | "sugerencias" | "stock" | "recepcion";
const TAB_IDS: TabId[] = ["pedidos", "sugerencias", "stock", "recepcion"];

const CLP = (n: number) =>
  n.toLocaleString("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  });

export default function ReabastecimientoPage() {
  const { showToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialTab = useMemo<TabId>(() => {
    const raw = searchParams.get("tab");
    return raw && (TAB_IDS as string[]).includes(raw) ? (raw as TabId) : "pedidos";
  }, [searchParams]);

  const [activeTab, setActiveTab] = useState<TabId>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const handleTabChange = useCallback(
    (key: string) => {
      const next = key as TabId;
      setActiveTab(next);
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", next);
      router.replace(`/admin/reabastecimiento?${params.toString()}`, {
        scroll: false,
      });
    },
    [router, searchParams]
  );

  const [lowData, setLowData] = useState<ReplenishmentResponse | null>(null);
  const [lowLoading, setLowLoading] = useState(true);

  const [orders, setOrders] = useState<SupplierOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  const loadLowStock = useCallback(async () => {
    setLowLoading(true);
    try {
      const res = await fetch("/api/admin/replenishment");
      if (!res.ok) throw new Error("Error cargando stock bajo");
      const data = (await res.json()) as ReplenishmentResponse;
      setLowData(data);
    } catch (error: any) {
      showToast(error.message || "Error cargando datos", "error");
    } finally {
      setLowLoading(false);
    }
  }, [showToast]);

  const loadOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const res = await fetch("/api/admin/supplier-orders");
      if (!res.ok) throw new Error("Error cargando pedidos");
      const data = await res.json();
      setOrders(data.orders || []);
    } catch (error: any) {
      showToast(error.message || "Error cargando pedidos", "error");
    } finally {
      setOrdersLoading(false);
    }
  }, [showToast]);

  const refreshAll = useCallback(() => {
    loadLowStock();
    loadOrders();
  }, [loadLowStock, loadOrders]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const stats = useMemo(() => {
    const active = orders.filter(
      (o) => !["recibido", "cancelado"].includes(o.status)
    ).length;
    const totalPending = orders
      .filter((o) => o.paymentStatus !== "pagado")
      .reduce((s, o) => s + o.total, 0);
    return { active, totalPending };
  }, [orders]);

  const tabs: Tab[] = [
    {
      key: "pedidos",
      label: "Pedidos",
      count: stats.active || undefined,
    },
    {
      key: "sugerencias",
      label: "Sugerencias",
    },
    {
      key: "stock",
      label: "Stock Bajo",
      count: lowData?.lowStockCount || undefined,
    },
    {
      key: "recepcion",
      label: "Recepción",
    },
  ];

  const isLoading = lowLoading || ordersLoading;

  return (
    <PageShell
      hero={
        <HeroHeader
          kicker="Reabastecimiento"
          title="Gestión de Compras"
          subtitle="Monitorea quiebres de stock y coordina proveedores"
          icon={<ShoppingCartIcon className="w-6 h-6 text-emerald-300" />}
          right={
            <button
              type="button"
              onClick={refreshAll}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-emerald-100 text-xs font-bold uppercase tracking-widest transition-colors"
              title="Actualizar datos"
            >
              <ArrowPathIcon
                className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
              />
              <span className="hidden sm:inline">Refrescar</span>
            </button>
          }
        />
      }
    >
      <StatsRow cols={3}>
        <StatsCard
          label="Stock Crítico"
          value={lowData?.lowStockCount ?? "—"}
          tone="rose"
          icon={<ExclamationTriangleIcon className="w-4 h-4" />}
        />
        <StatsCard
          label="Pedidos Activos"
          value={stats.active}
          tone="amber"
          icon={<BoltIcon className="w-4 h-4" />}
        />
        <StatsCard
          label="Pendiente de Pago"
          value={stats.totalPending > 0 ? CLP(stats.totalPending) : "$0"}
          tone="emerald"
          icon={<CurrencyDollarIcon className="w-4 h-4" />}
        />
      </StatsRow>

      <TabNav tabs={tabs} value={activeTab} onChange={handleTabChange} />

      {activeTab === "pedidos" && (
        <PedidosPanel
          orders={orders}
          loading={ordersLoading}
          onCreateFromSuggestions={() => handleTabChange("sugerencias")}
        />
      )}
      {activeTab === "sugerencias" && (
        <SugerenciasPanel
          onAfterDraftsCreated={() => {
            loadOrders();
          }}
        />
      )}
      {activeTab === "stock" && (
        <StockBajoPanel
          data={lowData}
          loading={lowLoading}
          onGoToSuggestions={() => handleTabChange("sugerencias")}
        />
      )}
      {activeTab === "recepcion" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <SparklesIcon className="h-4 w-4 text-emerald-500" />
            <span>
              Modo escáner: usá la pistola en cualquier momento o tipeá el SKU.
            </span>
            <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">
              <ArchiveBoxArrowDownIcon className="w-3.5 h-3.5" />
              Recepción rápida
            </span>
          </div>
          <RecepcionPanel />
        </div>
      )}
    </PageShell>
  );
}
