"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ClipboardDocumentListIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { useToast } from "@/contexts/ToastContext";
import {
  PageShell,
  HeroHeader,
  StatsRow,
  StatsCard,
  ResponsiveTable,
  StatusBadge,
  EmptyState,
  type Column,
} from "@/components/admin/shell";

interface Order {
  id: string;
  customer?: string;
  email?: string;
  date: string;
  total: number;
  status: string;
  items?: number;
}

type SortField = "id" | "customer" | "date" | "total" | "status";
type SortDir = "asc" | "desc";

const STATUS_OPTIONS = [
  "Todos",
  "Pendiente",
  "En proceso",
  "Enviado",
  "Gestionado",
  "Completado",
  "Cancelado",
];

export default function AdminOrdersPage() {
  const { showToast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDir>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const itemsPerPage = 10;
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await fetch("/api/admin/orders");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            const normalized: Order[] = data.map((o: any) => {
              const shipping = o.shipping_address || {};
              const customerName =
                shipping.fullName || shipping.name || o.user_id || "Cliente";
              const date = (
                o.created_at ||
                o.date ||
                new Date().toISOString()
              ).split("T")[0];
              return {
                id: o.id,
                customer: customerName,
                email: shipping.email || o.email || "-",
                date,
                total: Number(o.total) || 0,
                status: o.status || "Pendiente",
                items: o.items_count || 0,
              };
            });
            setOrders(normalized);
          }
        }
      } catch (error) {
        console.error("Failed to fetch orders", error);
        showToast("Error al cargar pedidos", "error");
      } finally {
        setLoaded(true);
      }
    };

    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const s = searchTerm.trim().toLowerCase();
      if (s) {
        const matchText =
          o.customer?.toLowerCase().includes(s) ||
          o.email?.toLowerCase().includes(s) ||
          o.id?.toLowerCase().includes(s) ||
          o.date?.toLowerCase().includes(s) ||
          (!!s && !isNaN(Number(s)) && Number(o.total) === Number(s));
        if (!matchText) return false;
      }
      if (statusFilter !== "Todos" && o.status !== statusFilter) return false;
      if (dateFrom && new Date(o.date) < new Date(dateFrom)) return false;
      if (dateTo && new Date(o.date) > new Date(dateTo)) return false;
      return true;
    });
  }, [orders, searchTerm, statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    const filtersActive = Boolean(
      searchTerm || dateFrom || dateTo || (statusFilter && statusFilter !== "Todos")
    );
    if (loaded && filtersActive && filteredOrders.length === 0) {
      showToast("No se encontraron pedidos", "warning", 5000);
    }
  }, [loaded, filteredOrders.length, searchTerm, dateFrom, dateTo, statusFilter, showToast]);

  const sortedOrders = useMemo(() => {
    const arr = [...filteredOrders];
    arr.sort((a, b) => {
      let cmp = 0;
      if (sortField === "id" || sortField === "customer" || sortField === "status") {
        cmp = (a[sortField] || "")
          .toString()
          .localeCompare((b[sortField] || "").toString());
      } else if (sortField === "date") {
        cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (sortField === "total") {
        cmp = a.total - b.total;
      }
      return sortDirection === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [filteredOrders, sortField, sortDirection]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedOrders.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedOrders.length / itemsPerPage) || 1;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection(field === "date" ? "desc" : "asc");
    }
  };

  const paginate = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  // Normaliza claves de status del backend al statusMap unificado
  const normalizeStatus = (s: string) => {
    const k = s.toLowerCase().replace(/\s+/g, "_");
    if (k === "en_proceso") return "preparando";
    return k;
  };

  const stats = useMemo(() => {
    const byStatus = (s: string) =>
      orders.filter((o) => o.status === s).length;
    return {
      total: orders.length,
      enProceso: byStatus("En proceso") + byStatus("Pendiente"),
      gestionado: byStatus("Gestionado"),
      completado: byStatus("Completado"),
      cancelado: byStatus("Cancelado"),
    };
  }, [orders]);

  const SortHeader = ({
    field,
    children,
  }: {
    field: SortField;
    children: React.ReactNode;
  }) => {
    const active = sortField === field;
    return (
      <button
        type="button"
        onClick={() => handleSort(field)}
        className="inline-flex items-center gap-1 focus:outline-none"
      >
        {children}
        {active &&
          (sortDirection === "asc" ? (
            <ArrowUpIcon className="h-3 w-3" />
          ) : (
            <ArrowDownIcon className="h-3 w-3" />
          ))}
      </button>
    );
  };

  const columns: Column<Order>[] = [
    {
      key: "id",
      header: <SortHeader field="id">ID</SortHeader>,
      cell: (o) => (
        <span className="font-black tracking-widest text-emerald-700 text-[11px] uppercase">
          #{o.id.substring(0, 8)}…
        </span>
      ),
    },
    {
      key: "customer",
      header: <SortHeader field="customer">Cliente</SortHeader>,
      cell: (o) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold ring-2 ring-white shadow-sm shrink-0">
            {o.customer?.[0]?.toUpperCase() || "C"}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-gray-900 truncate">
              {o.customer || "Cliente Invitado"}
            </div>
            <div className="text-xs text-gray-500 truncate">
              {o.email || "Sin email"}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "date",
      header: <SortHeader field="date">Fecha</SortHeader>,
      cell: (o) => (
        <span className="text-sm font-medium text-gray-600">{o.date}</span>
      ),
    },
    {
      key: "total",
      header: <SortHeader field="total">Total</SortHeader>,
      cell: (o) => (
        <span className="text-sm font-black text-gray-900">
          ${o.total.toLocaleString("es-CL")}
        </span>
      ),
      align: "right",
    },
    {
      key: "status",
      header: <SortHeader field="status">Estado</SortHeader>,
      cell: (o) => <StatusBadge status={normalizeStatus(o.status)} size="sm" />,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (o) => (
        <Link
          href={`/admin/pedidos/${o.id}`}
          className="inline-flex items-center gap-2 px-3 py-2 bg-white ring-1 ring-gray-200 text-emerald-700 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-emerald-50 hover:ring-emerald-200 transition-colors min-h-[36px]"
        >
          <EyeIcon className="h-4 w-4" /> Ver
        </Link>
      ),
    },
  ];

  const renderMobileCard = (o: Order) => (
    <div className="bg-white p-4 rounded-2xl ring-1 ring-gray-200 space-y-3">
      <div className="flex justify-between items-start gap-3">
        <div className="min-w-0">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            Pedido #{o.id.substring(0, 8)}…
          </span>
          <p className="text-sm font-black text-gray-900 mt-0.5">
            ${o.total.toLocaleString("es-CL")}
          </p>
        </div>
        <StatusBadge status={normalizeStatus(o.status)} size="sm" />
      </div>

      <div className="flex flex-col gap-0.5">
        <div className="text-sm font-bold text-gray-800 truncate">
          {o.customer || "—"}
        </div>
        <div className="text-xs text-gray-500 truncate">{o.email || ""}</div>
        <div className="text-[10px] text-gray-400 italic mt-0.5">{o.date}</div>
      </div>

      <div className="pt-3 border-t border-gray-100 flex justify-end">
        <Link
          href={`/admin/pedidos/${o.id}`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-emerald-100 transition-colors min-h-[36px]"
        >
          <EyeIcon className="h-4 w-4" />
          Ver pedido
        </Link>
      </div>
    </div>
  );

  return (
    <PageShell
      hero={
        <HeroHeader
          kicker="Pedidos"
          title="Pedidos de Clientes"
          subtitle="Gestión de órdenes recibidas desde la tienda online"
          icon={<ClipboardDocumentListIcon className="w-6 h-6 text-emerald-300" />}
        />
      }
    >
      <StatsRow cols={4}>
        <StatsCard
          label="Total pedidos"
          value={stats.total.toLocaleString()}
          tone="default"
          icon={<ClipboardDocumentListIcon className="w-4 h-4" />}
        />
        <StatsCard
          label="En proceso"
          value={stats.enProceso.toLocaleString()}
          tone="amber"
        />
        <StatsCard
          label="Completados"
          value={stats.completado.toLocaleString()}
          tone="emerald"
        />
        <StatsCard
          label="Cancelados"
          value={stats.cancelado.toLocaleString()}
          tone="rose"
        />
      </StatsRow>

      <div className="bg-white p-4 rounded-2xl ring-1 ring-gray-200 shadow-sm">
        <div className="grid gap-3 md:grid-cols-5">
          <div className="relative md:col-span-2">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border-none rounded-xl text-sm font-bold text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-emerald-500"
              placeholder="Buscar cliente, email, ID, fecha o monto"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          <select
            className="bg-gray-50 border-none rounded-xl px-3 py-2.5 text-sm font-bold focus:ring-2 focus:ring-emerald-500"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt === "Todos" ? "Todos los estados" : opt}
              </option>
            ))}
          </select>
          <input
            type="date"
            className="bg-gray-50 border-none rounded-xl px-3 py-2.5 text-sm font-bold focus:ring-2 focus:ring-emerald-500"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setCurrentPage(1);
            }}
          />
          <input
            type="date"
            className="bg-gray-50 border-none rounded-xl px-3 py-2.5 text-sm font-bold focus:ring-2 focus:ring-emerald-500"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
        <div className="mt-3 flex items-center justify-between flex-wrap gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
            {filteredOrders.length === 0
              ? "Sin resultados"
              : `${currentItems.length} de ${filteredOrders.length} pedidos`}
          </span>
          <button
            onClick={() => {
              setSearchTerm("");
              setStatusFilter("Todos");
              setDateFrom("");
              setDateTo("");
              setCurrentPage(1);
              showToast("Filtros limpiados", "info");
            }}
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-[10px] font-black uppercase tracking-widest rounded-lg transition-colors min-h-[36px]"
          >
            Limpiar
          </button>
        </div>
      </div>

      <ResponsiveTable<Order>
        columns={columns}
        rows={currentItems}
        rowKey={(o) => o.id}
        renderMobileCard={renderMobileCard}
        emptyState={
          <EmptyState
            icon={<ClipboardDocumentListIcon className="h-7 w-7" />}
            title="No hay pedidos"
            description="Probá ajustar los filtros o esperá nuevos pedidos."
          />
        }
      />

      {totalPages > 1 && (
        <div className="bg-white px-4 py-3 ring-1 ring-gray-200 rounded-2xl flex items-center justify-between flex-wrap gap-3">
          <span className="text-xs text-gray-500">
            Página {currentPage} de {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => paginate(currentPage - 1)}
              disabled={currentPage === 1}
              className={`p-2 rounded-lg ring-1 ring-gray-200 min-h-[36px] min-w-[36px] ${
                currentPage === 1
                  ? "text-gray-300 cursor-not-allowed"
                  : "hover:bg-gray-50 text-gray-600"
              }`}
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </button>
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => paginate(i + 1)}
                className={`px-3 py-1.5 rounded-lg ring-1 text-sm min-h-[36px] ${
                  currentPage === i + 1
                    ? "bg-emerald-50 ring-emerald-500 text-emerald-700 font-bold"
                    : "ring-gray-200 hover:bg-gray-50 text-gray-600"
                }`}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => paginate(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`p-2 rounded-lg ring-1 ring-gray-200 min-h-[36px] min-w-[36px] ${
                currentPage === totalPages
                  ? "text-gray-300 cursor-not-allowed"
                  : "hover:bg-gray-50 text-gray-600"
              }`}
            >
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </PageShell>
  );
}
