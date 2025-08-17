"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { ArrowUpIcon, ArrowDownIcon, ChevronLeftIcon, ChevronRightIcon, EyeIcon } from "@heroicons/react/24/outline";
import { useToast } from "@/contexts/ToastContext";

// Tipo normalizado que usará la tabla
interface Order {
  id: string;
  customer?: string; // puede no venir todavía
  email?: string;
  date: string; // YYYY-MM-DD
  total: number;
  status: string;
  items?: number; // cantidad de items
}

// Tipo bruto que podría venir de distintos orígenes (checkout usa campos en español)
type RawOrder = any;

export default function AdminOrdersPage() {
  // ...existing code...
  // ...existing code...
  const { showToast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [sortField, setSortField] = useState<keyof Order | "date">("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const itemsPerPage = 10;

  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("orders") : null;
      if (raw) {
        const parsed: RawOrder[] = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const normalized: Order[] = parsed.map(o => {
            // Campos posibles: id, fecha/date, total, estado/status, productos, items
            const date = (o.date || o.fecha || new Date().toISOString().split("T")[0]).toString();
            const status = (o.status || o.estado || "Desconocido").toString();
            const total = Number(o.total) || 0;
            const itemsCount = typeof o.items === 'number' ? o.items : (Array.isArray(o.items) ? o.items.reduce((acc: number, it: any) => acc + (Number(it.quantity)||0), 0) : (o.productos || 0));
            return {
              id: o.id?.toString() || "SIN-ID",
              customer: o.customer || o.cliente || o.name || "-",
              email: o.email || o.correo || undefined,
              date: date.length > 10 ? date.split("T")[0] : date,
              total,
              status,
              items: itemsCount
            };
          });
          setOrders(normalized);
        }
      }
    } catch {}
  }, []);
  // Memo para evitar recalcular en cada render
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
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
      if (dateFrom) {
        if (new Date(o.date) < new Date(dateFrom)) return false;
      }
      if (dateTo) {
        if (new Date(o.date) > new Date(dateTo)) return false;
      }
      return true;
    });
  }, [orders, searchTerm, statusFilter, dateFrom, dateTo]);

  // Mostrar toast si no hay resultados
  useEffect(() => {
    if (filteredOrders.length === 0) {
      showToast('No se encontraron pedidos', 'warning');
    }
  }, [filteredOrders.length, showToast]);

  const sortedOrders = useMemo(() => {
    const arr = [...filteredOrders];
    arr.sort((a, b) => {
      let cmp = 0;
      if (sortField === "id" || sortField === "customer" || sortField === "status") {
        cmp = (a[sortField] || "").toString().localeCompare((b[sortField] || "").toString());
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

  const handleSort = (field: keyof Order | "date") => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const paginate = (page: number) => {
  if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  return (
  <div className="p-6 space-y-8" aria-label="Lista de pedidos">
      <div className="flex flex-col gap-4">
        <div className="grid gap-2 md:grid-cols-5">
          <input
            className="border rounded px-3 py-2 text-sm w-full"
            placeholder="Buscar cliente, email, ID, fecha o monto"
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          />
          <select
            className="border rounded px-2 py-2 text-sm"
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
          >
            <option value="Todos">Todos los estados</option>
            <option value="En proceso">En proceso</option>
            <option value="Enviado">Enviado</option>
            <option value="Completado">Completado</option>
            <option value="Cancelado">Cancelado</option>
          </select>
          <input
            type="date"
            className="border rounded px-3 py-2 text-sm"
            value={dateFrom}
            onChange={e => { setDateFrom(e.target.value); setCurrentPage(1); }}
            placeholder="Desde"
          />
            <input
            type="date"
            className="border rounded px-3 py-2 text-sm"
            value={dateTo}
            onChange={e => { setDateTo(e.target.value); setCurrentPage(1); }}
            placeholder="Hasta"
          />
          <button
            onClick={() => { setSearchTerm(""); setStatusFilter("Todos"); setDateFrom(""); setDateTo(""); setCurrentPage(1); showToast('Filtros limpiados', 'info'); }}
            className="border rounded px-3 py-2 text-sm hover:bg-gray-50"
            aria-label="Limpiar filtros"
          >Limpiar</button>
        </div>
        <div className="text-xs md:text-sm text-gray-500">
          {filteredOrders.length === 0 ? "Sin resultados" : `Mostrando ${currentItems.length} de ${filteredOrders.length} pedidos`}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 select-none">
              <tr>
                <HeaderCell label="ID" active={sortField === 'id'} dir={sortDirection} onClick={() => handleSort('id')} />
                <HeaderCell label="Cliente" active={sortField === 'customer'} dir={sortDirection} onClick={() => handleSort('customer')} />
                <HeaderCell label="Fecha" active={sortField === 'date'} dir={sortDirection} onClick={() => handleSort('date')} />
                <HeaderCell label="Total" active={sortField === 'total'} dir={sortDirection} onClick={() => handleSort('total')} />
                <HeaderCell label="Estado" active={sortField === 'status'} dir={sortDirection} onClick={() => handleSort('status')} />
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentItems.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-500">No hay pedidos.</td>
                </tr>
              )}
              {currentItems.map(o => (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">{o.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{o.customer || '-'}</div>
                    <div className="text-xs text-gray-500">{o.email || ''}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{o.date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${o.total.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={o.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link href={`/admin/pedidos/${o.id}`} className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1">
                      <EyeIcon className="h-5 w-5" /> Ver
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredOrders.length > itemsPerPage && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
            <div className="flex items-center gap-1">
              <button onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1} className={`p-2 rounded border ${currentPage === 1 ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-gray-50 text-gray-600'}`}> <ChevronLeftIcon className="h-5 w-5" /> </button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button key={i} onClick={() => paginate(i + 1)} className={`px-3 py-1 rounded border text-sm ${currentPage === i + 1 ? 'bg-blue-50 border-blue-500 text-blue-600 font-medium' : 'hover:bg-gray-50 text-gray-600'}`}>{i + 1}</button>
              ))}
              <button onClick={() => paginate(currentPage + 1)} disabled={currentPage === totalPages} className={`p-2 rounded border ${currentPage === totalPages ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-gray-50 text-gray-600'}`}> <ChevronRightIcon className="h-5 w-5" /> </button>
            </div>
            <div className="text-xs text-gray-500">Página {currentPage} de {totalPages}</div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <SummaryCard label="Total pedidos" value={orders.length} />
        <SummaryCard label="En proceso" value={orders.filter(o => o.status === 'En proceso').length} color="text-yellow-600" />
        <SummaryCard label="Completados" value={orders.filter(o => o.status === 'Completado').length} color="text-green-600" />
        <SummaryCard label="Cancelados" value={orders.filter(o => o.status === 'Cancelado').length} color="text-red-600" />
      </div>
    </div>
  );
}

function HeaderCell({ label, active, dir, onClick }: { label: string; active: boolean; dir: 'asc' | 'desc'; onClick: () => void }) {
  return (
    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
      <button onClick={onClick} className="flex items-center gap-1 group">
        <span>{label}</span>
        {active && (dir === 'asc' ? <ArrowUpIcon className="h-3 w-3 text-gray-600" /> : <ArrowDownIcon className="h-3 w-3 text-gray-600" />)}
      </button>
    </th>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    'En proceso': 'bg-yellow-100 text-yellow-700',
    'Enviado': 'bg-blue-100 text-blue-700',
    'Completado': 'bg-green-100 text-green-700',
    'Cancelado': 'bg-red-100 text-red-700'
  };
  return <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${map[status] || 'bg-gray-100 text-gray-600'}`}>{status}</span>;
}

function SummaryCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="text-sm font-medium text-gray-500 mb-1">{label}</div>
      <div className={`text-3xl font-semibold ${color || 'text-gray-900'}`}>{value}</div>
    </div>
  );
}
