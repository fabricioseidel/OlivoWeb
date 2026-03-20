"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowPathIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  ClockIcon,
  BanknotesIcon,
  CheckCircleIcon,
  TruckIcon,
  ExclamationTriangleIcon,
  ShoppingCartIcon,
} from "@heroicons/react/24/outline";
import Button from "@/components/ui/Button";
import { useToast } from "@/contexts/ToastContext";

// ════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════

type SupplierSummary = {
  id: string;
  name: string;
  contact_name?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
};

type ProductSupplier = {
  id: string;
  supplierId: string;
  productId: string;
  priority: number;
  supplierSku?: string | null;
  defaultReorderQty?: number | null;
  reorderThreshold?: number | null;
  deficit: number;
  suggestedQty: number;
  supplier: SupplierSummary;
};

type ReplenishmentProduct = {
  productId: string;
  name: string;
  stock: number;
  threshold: number;
  deficit: number;
  salePrice?: number | null;
  imageUrl?: string | null;
  suppliers: ProductSupplier[];
};

type ReplenishmentResponse = {
  generatedAt: string;
  totalProducts: number;
  lowStockCount: number;
  items: ReplenishmentProduct[];
};

type SupplierGroupItem = {
  product: ReplenishmentProduct;
  assignment: ProductSupplier;
};

type SupplierGroup = {
  supplier: SupplierSummary;
  lowProducts: SupplierGroupItem[];
};

interface SupplierOrder {
  id: string;
  supplierId: string;
  supplierName: string;
  orderDate: string;
  expectedDate?: string;
  deliveredDate?: string;
  status: 'pendiente' | 'confirmado' | 'enviado_por_whatsapp' | 'gestionado' | 'recibido' | 'cancelado';
  paymentStatus: 'pendiente' | 'parcial' | 'pagado';
  total: number;
  itemCount: number;
  notes?: string;
}

// ════════════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════════════

const statusColors: Record<string, string> = {
  pendiente: 'bg-yellow-100 text-yellow-800',
  confirmado: 'bg-blue-100 text-blue-800',
  enviado_por_whatsapp: 'bg-purple-100 text-purple-800',
  gestionado: 'bg-indigo-100 text-indigo-800',
  recibido: 'bg-green-100 text-green-800',
  cancelado: 'bg-red-100 text-red-800',
};

const statusLabels: Record<string, string> = {
  pendiente: 'Pendiente',
  confirmado: 'Confirmado',
  enviado_por_whatsapp: 'WhatsApp',
  gestionado: 'Gestionado',
  recibido: 'Recibido',
  cancelado: 'Cancelado',
};

const paymentStatusColors: Record<string, string> = {
  pendiente: 'bg-red-100 text-red-800',
  parcial: 'bg-yellow-100 text-yellow-800',
  pagado: 'bg-green-100 text-green-800',
};

const paymentLabels: Record<string, string> = {
  pendiente: 'Sin pagar',
  parcial: 'Parcial',
  pagado: 'Pagado',
};

// ════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════

function buildSupplierGroups(items: ReplenishmentProduct[]): SupplierGroup[] {
  const map = new Map<string, SupplierGroup>();
  items.forEach((product) => {
    product.suppliers.forEach((assignment) => {
      const sid = assignment.supplier.id;
      if (!map.has(sid)) {
        map.set(sid, { supplier: assignment.supplier, lowProducts: [] });
      }
      map.get(sid)!.lowProducts.push({ product, assignment });
    });
  });
  return Array.from(map.values()).sort((a, b) =>
    b.lowProducts.length - a.lowProducts.length
  );
}

// ════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════

type TabId = "stock" | "pedidos";

export default function ComprasPage() {
  const { showToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as TabId) || "stock";

  const [activeTab, setActiveTab] = useState<TabId>(initialTab);

  // ── Tab: Stock Bajo ──
  const [lowLoading, setLowLoading] = useState(true);
  const [lowData, setLowData] = useState<ReplenishmentResponse | null>(null);

  // ── Tab: Pedidos ──
  const [orders, setOrders] = useState<SupplierOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("todos");

  // ═══════════════════ DATA LOADING ═══════════════════

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

  useEffect(() => {
    loadLowStock();
    loadOrders();
  }, [loadLowStock, loadOrders]);

  // ═══════════════════ MEMOS ═══════════════════

  const supplierGroups = useMemo(
    () => buildSupplierGroups(lowData?.items ?? []),
    [lowData]
  );

  const filteredOrders = useMemo(() => {
    let filtered = orders;
    if (orderSearch.trim()) {
      const q = orderSearch.toLowerCase();
      filtered = filtered.filter(o =>
        o.id.toLowerCase().includes(q) ||
        o.supplierName.toLowerCase().includes(q)
      );
    }
    if (orderStatusFilter !== "todos") {
      filtered = filtered.filter(o => o.status === orderStatusFilter);
    }
    return filtered.sort((a, b) =>
      new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()
    );
  }, [orders, orderSearch, orderStatusFilter]);

  const stats = useMemo(() => {
    const active = orders.filter(o => !['recibido', 'cancelado'].includes(o.status)).length;
    const unpaid = orders.filter(o => o.paymentStatus === 'pendiente').length;
    const totalPending = orders
      .filter(o => o.paymentStatus !== 'pagado')
      .reduce((s, o) => s + o.total, 0);
    return { active, unpaid, totalPending };
  }, [orders]);

  // ═══════════════════ RENDER ═══════════════════

  const tabs = [
    { id: "stock" as TabId, label: "Stock Bajo", icon: ExclamationTriangleIcon, badge: lowData?.lowStockCount },
    { id: "pedidos" as TabId, label: "Pedidos", icon: ShoppingCartIcon, badge: stats.active || undefined },
  ];

  return (
    <div className="-m-4 sm:-m-8">
      {/* ── Premium Admin Header ── */}
      <div className="bg-emerald-950 p-8 sm:p-12 mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[120px]" />
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-end lg:items-center gap-6">
            <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 backdrop-blur-md rounded-full text-emerald-400 text-[10px] font-black uppercase tracking-widest mb-4 border border-white/5">
                    <ShoppingCartIcon className="size-3" />
                    <span>Reabastecimiento</span>
                </div>
                <h1 className="text-4xl font-black text-white tracking-tight">Gestión de Compras</h1>
                <p className="mt-2 text-emerald-100/50 font-medium italic">
                    Monitorea quiebres de stock y coordina proveedores
                </p>
            </div>
            
            <div className="flex items-center gap-4">
                <div className="flex gap-4 p-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/5">
                   <div className="text-center px-4 border-r border-white/10">
                       <p className="text-3xl font-black text-rose-400">{lowData?.lowStockCount ?? "—"}</p>
                       <p className="text-[10px] text-emerald-100/50 uppercase font-black tracking-widest mt-1">Stock Crítico</p>
                   </div>
                   <div className="text-center px-4 border-r border-white/10">
                       <p className="text-3xl font-black text-amber-400">{stats.active}</p>
                       <p className="text-[10px] text-emerald-100/50 uppercase font-black tracking-widest mt-1">Activos</p>
                   </div>
                   <div className="text-center px-4">
                       <p className="text-3xl font-black text-emerald-400">${stats.totalPending > 0 ? (stats.totalPending / 1000).toFixed(0) + "k" : "0"}</p>
                       <p className="text-[10px] text-emerald-100/50 uppercase font-black tracking-widest mt-1">Pendiente</p>
                   </div>
                </div>

                <button
                    onClick={() => { loadLowStock(); loadOrders(); }}
                    className={`p-4 rounded-2xl bg-emerald-800 hover:bg-emerald-700 text-emerald-100 transition-colors shadow-sm hidden sm:block ${lowLoading || ordersLoading ? 'animate-pulse' : ''}`}
                    title="Actualizar datos"
                >
                    <ArrowPathIcon className={`h-6 w-6 ${lowLoading || ordersLoading ? 'animate-spin text-emerald-300' : ''}`} />
                </button>
            </div>
        </div>
      </div>

      <div className="px-4 sm:px-8 pb-12 space-y-8">
        {/* ── Tabs ── */}
      <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${
              activeTab === tab.id
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            <span>{tab.label}</span>
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                activeTab === tab.id ? "bg-red-100 text-red-700" : "bg-gray-200 text-gray-600"
              }`}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ══════════════════ TAB: STOCK BAJO ══════════════════ */}
      {activeTab === "stock" && (
        <div className="space-y-4">
          {lowLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-emerald-500" />
            </div>
          ) : supplierGroups.length === 0 ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-8 text-center">
              <CheckCircleIcon className="h-12 w-12 text-emerald-400 mx-auto mb-3" />
              <p className="font-semibold text-emerald-800">¡Stock al día!</p>
              <p className="text-sm text-emerald-600 mt-1">
                No hay productos por debajo del umbral de reposición.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {supplierGroups.map((group) => (
                <SupplierStockCard key={group.supplier.id} group={group} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════ TAB: PEDIDOS ══════════════════ */}
      {activeTab === "pedidos" && (
        <div className="space-y-4">
          {/* New Order Button */}
          <Link href="/admin/reabastecimiento?tab=stock">
            <Button className="w-full py-3 text-sm">
              <PlusIcon className="h-5 w-5 mr-2" />
              Crear Pedido desde Stock Bajo
            </Button>
          </Link>

          {/* Filters */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar..."
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            <select
              value={orderStatusFilter}
              onChange={(e) => setOrderStatusFilter(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
            >
              <option value="todos">Todos</option>
              <option value="pendiente">Pendiente</option>
              <option value="gestionado">Gestionado</option>
              <option value="recibido">Recibido</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>

          {/* Orders List */}
          {ordersLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-emerald-500" />
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="bg-white rounded-xl border p-8 text-center">
              <p className="text-sm text-gray-500">No se encontraron pedidos</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredOrders.map((order) => (
                <Link key={order.id} href={`/admin/pedidos-proveedor/${order.id}`}>
                  <div className="bg-white rounded-xl border p-4 space-y-2 hover:shadow-md transition active:scale-[0.99]">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-sm font-bold text-gray-900">{order.supplierName}</div>
                        <div className="text-[10px] text-gray-400 font-mono">#{order.id.slice(0, 8)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-base font-black text-emerald-600">${order.total.toLocaleString()}</div>
                        <div className="text-[10px] text-gray-400">{order.itemCount} prod.</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex gap-1.5">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase ${statusColors[order.status] || 'bg-gray-100 text-gray-600'}`}>
                          {statusLabels[order.status] || order.status}
                        </span>
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase ${paymentStatusColors[order.paymentStatus] || 'bg-gray-100 text-gray-600'}`}>
                          {paymentLabels[order.paymentStatus] || order.paymentStatus}
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-400">
                        {new Date(order.orderDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// SUPPLIER STOCK CARD (for Stock Bajo tab)
// ════════════════════════════════════════════════════════════════════

function SupplierStockCard({ group }: { group: SupplierGroup }) {
  const sorted = group.lowProducts.sort(
    (a, b) => a.product.stock - b.product.stock
  );
  const topProducts = sorted.slice(0, 4);
  const remaining = sorted.length - topProducts.length;

  return (
    <div className="bg-white border rounded-xl p-4 space-y-3 hover:shadow-sm transition">
      {/* Supplier Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-gray-900 truncate">
            {group.supplier.name}
          </h3>
          <p className="text-[10px] text-gray-500 mt-0.5">
            {group.supplier.contact_name && `${group.supplier.contact_name} • `}
            {group.supplier.whatsapp || group.supplier.phone || "Sin teléfono"}
          </p>
        </div>
        <span className="shrink-0 text-[10px] font-bold bg-red-100 text-red-700 px-2.5 py-1 rounded-full">
          {group.lowProducts.length} bajos
        </span>
      </div>

      {/* Product Pills */}
      <div className="flex flex-wrap gap-1.5">
        {topProducts.map(({ product }) => {
          const isZero = product.stock === 0;
          return (
            <span
              key={product.productId}
              className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full border ${
                isZero
                  ? "bg-red-50 border-red-200 text-red-700"
                  : "bg-yellow-50 border-yellow-200 text-yellow-700"
              }`}
            >
              <span className="font-medium truncate max-w-[140px]">{product.name}</span>
              <span className="font-black">{product.stock}/{product.threshold}</span>
            </span>
          );
        })}
        {remaining > 0 && (
          <span className="text-[10px] text-gray-400 self-center">
            +{remaining} más
          </span>
        )}
      </div>

      {/* Action */}
      <Link href={`/admin/pedidos-proveedor/nuevo?supplierId=${group.supplier.id}`}>
        <button className="w-full mt-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition active:scale-[0.98]">
          <ShoppingCartIcon className="h-4 w-4 inline mr-1.5 -mt-0.5" />
          Crear Pedido
        </button>
      </Link>
    </div>
  );
}
