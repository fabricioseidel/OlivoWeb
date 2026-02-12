"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
    ArrowUpIcon,
    ArrowDownIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    EyeIcon,
    MagnifyingGlassIcon,
    FunnelIcon,
    CheckCircleIcon,
    XCircleIcon,
    ClockIcon,
    TruckIcon,
    CreditCardIcon
} from "@heroicons/react/24/outline";
import { useToast } from "@/contexts/ToastContext";

interface Order {
    id: string;
    customer: string;
    email: string;
    date: string;
    total: number;
    status: string; // "Pendiente" | "Procesando" | "Enviado" | "Completado" | "Cancelado"
    items: number;
    paymentStatus: "paid" | "pending" | "failed";
    fulfillmentStatus: "fulfilled" | "unfulfilled" | "partial";
}

const TABS = [
    { id: "all", label: "Todos" },
    { id: "unfulfilled", label: "Sin preparar" },
    { id: "unpaid", label: "Sin pagar" },
    { id: "open", label: "Abiertos" },
    { id: "closed", label: "Cerrados" },
];

export default function AdminOrdersPage() {
    const { showToast } = useToast();
    const [orders, setOrders] = useState<Order[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [activeTab, setActiveTab] = useState("all");
    const [sortField, setSortField] = useState<keyof Order | "date">("date");
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
    const itemsPerPage = 15;
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const res = await fetch('/api/admin/orders');
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data)) {
                        const normalized: Order[] = data.map((o: any) => {
                            const shipping = o.shipping_address || {};
                            const customerName = shipping.fullName || shipping.name || o.user_id || 'Cliente';
                            const date = (o.created_at || o.date || new Date().toISOString()).split('T')[0];
                            const status = o.status || 'Pendiente';

                            // Inference logic for Shopify-like statuses
                            let paymentStatus: Order['paymentStatus'] = 'pending';
                            let fulfillmentStatus: Order['fulfillmentStatus'] = 'unfulfilled';

                            if (status === 'Completado') {
                                paymentStatus = 'paid';
                                fulfillmentStatus = 'fulfilled';
                            } else if (status === 'Enviado') {
                                paymentStatus = 'paid';
                                fulfillmentStatus = 'fulfilled';
                            } else if (status === 'Procesando') {
                                paymentStatus = 'paid'; // Assumed paid if processing
                                fulfillmentStatus = 'unfulfilled';
                            } else if (status === 'Cancelado') {
                                paymentStatus = 'failed';
                                fulfillmentStatus = 'unfulfilled';
                            }

                            return {
                                id: o.id,
                                customer: customerName,
                                email: shipping.email || o.email || '',
                                date: date,
                                total: Number(o.total) || 0,
                                status: status,
                                items: o.items_count || 0,
                                paymentStatus,
                                fulfillmentStatus
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
    }, [showToast]);

    const filteredOrders = useMemo(() => {
        return orders.filter(o => {
            // Search
            const s = searchTerm.trim().toLowerCase();
            if (s) {
                const matchText =
                    o.customer.toLowerCase().includes(s) ||
                    o.email.toLowerCase().includes(s) ||
                    o.id.toLowerCase().includes(s) ||
                    o.date.includes(s) ||
                    (!isNaN(Number(s)) && Number(o.total) === Number(s));
                if (!matchText) return false;
            }

            // Tabs
            if (activeTab === 'unfulfilled') return o.fulfillmentStatus === 'unfulfilled' && o.status !== 'Cancelado';
            if (activeTab === 'unpaid') return o.paymentStatus === 'pending' && o.status !== 'Cancelado';
            if (activeTab === 'open') return o.status !== 'Completado' && o.status !== 'Cancelado';
            if (activeTab === 'closed') return o.status === 'Completado' || o.status === 'Cancelado';

            return true;
        });
    }, [orders, searchTerm, activeTab]);

    const sortedOrders = useMemo(() => {
        const arr = [...filteredOrders];
        arr.sort((a, b) => {
            let cmp = 0;
            if (sortField === "total" || sortField === "items") {
                cmp = a[sortField] - b[sortField];
            } else {
                cmp = (a[sortField] || "").toString().localeCompare((b[sortField] || "").toString());
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

    const toggleSelectAll = () => {
        if (selectedOrders.size === currentItems.length) {
            setSelectedOrders(new Set());
        } else {
            setSelectedOrders(new Set(currentItems.map(o => o.id)));
        }
    };

    const toggleSelect = (id: string) => {
        const next = new Set(selectedOrders);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedOrders(next);
    };

    const paginate = (page: number) => {
        if (page >= 1 && page <= totalPages) setCurrentPage(page);
    };

    if (!loaded) return (
        <div className="flex justify-center items-center h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
        </div>
    );

    return (
        <div className="space-y-6 pb-20">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Pedidos</h1>
                <div className="flex items-center gap-2">
                    <button className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                        <ArrowDownIcon className="h-4 w-4" /> Exportar
                    </button>
                    {/* Placeholder for future action */}
                </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* TODO: Real metrics logic */}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {/* Tabs */}
                <div className="border-b border-gray-200 overflow-x-auto">
                    <nav className="flex -mb-px px-4" aria-label="Tabs">
                        {TABS.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => { setActiveTab(tab.id); setCurrentPage(1); }}
                                className={`whitespace-nowrap py-4 px-4 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.id
                                    ? "border-emerald-500 text-emerald-600"
                                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Filters Row */}
                <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex flex-col sm:flex-row gap-4 items-center">
                    <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                            placeholder="Buscar pedidos..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                        <FunnelIcon className="h-4 w-4" /> Filtros
                    </button>
                    <button className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                        <ArrowUpIcon className="h-4 w-4" /> Ordenar
                    </button>
                </div>

                {/* Table */}
                <div className="overflow-x-auto min-h-[400px]">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left">
                                    <input
                                        type="checkbox"
                                        className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                                        checked={selectedOrders.size > 0 && selectedOrders.size === currentItems.length}
                                        onChange={toggleSelectAll}
                                    />
                                </th>
                                <HeaderCell label="Pedido" sortKey="id" currentSort={sortField} dir={sortDirection} onSort={handleSort} />
                                <HeaderCell label="Fecha" sortKey="date" currentSort={sortField} dir={sortDirection} onSort={handleSort} />
                                <HeaderCell label="Cliente" sortKey="customer" currentSort={sortField} dir={sortDirection} onSort={handleSort} />
                                <HeaderCell label="Pago" sortKey="paymentStatus" currentSort={sortField} dir={sortDirection} onSort={handleSort} />
                                <HeaderCell label="Entrega" sortKey="fulfillmentStatus" currentSort={sortField} dir={sortDirection} onSort={handleSort} />
                                <HeaderCell label="Total" sortKey="total" currentSort={sortField} dir={sortDirection} onSort={handleSort} />
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {currentItems.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-500">
                                        No se encontraron pedidos.
                                    </td>
                                </tr>
                            )}
                            {currentItems.map((order) => (
                                <tr key={order.id} className="hover:bg-gray-50 transition-colors group cursor-pointer">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <input
                                            type="checkbox"
                                            className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                                            checked={selectedOrders.has(order.id)}
                                            onChange={() => toggleSelect(order.id)}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                                        <Link href={`/dashboard/pedidos/${order.id}`} className="hover:underline">
                                            #{order.id.slice(0, 8).toUpperCase()}
                                        </Link>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(order.date).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">{order.customer}</div>
                                        <div className="text-xs text-gray-500">{order.items} items</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <PaymentBadge status={order.paymentStatus} />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <FulfillmentBadge status={order.fulfillmentStatus} />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                                        ${order.total.toLocaleString('es-CL')}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {filteredOrders.length > itemsPerPage && (
                    <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
                        <div className="flex-1 flex justify-between sm:hidden">
                            <button
                                onClick={() => paginate(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                            >
                                Anterior
                            </button>
                            <button
                                onClick={() => paginate(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                            >
                                Siguiente
                            </button>
                        </div>
                        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm text-gray-700">
                                    Mostrando <span className="font-medium">{indexOfFirstItem + 1}</span> a <span className="font-medium">{Math.min(indexOfLastItem, filteredOrders.length)}</span> de <span className="font-medium">{filteredOrders.length}</span> resultados
                                </p>
                            </div>
                            <div>
                                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                    <button
                                        onClick={() => paginate(currentPage - 1)}
                                        disabled={currentPage === 1}
                                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                                    >
                                        <span className="sr-only">Anterior</span>
                                        <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
                                    </button>
                                    {/* Pagination logic simplified for brevity */}
                                    {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => ( // Show max 5 pages
                                        <button
                                            key={i}
                                            onClick={() => paginate(i + 1)}
                                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${currentPage === i + 1
                                                ? "z-10 bg-emerald-50 border-emerald-500 text-emerald-600"
                                                : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                                                }`}
                                        >
                                            {i + 1}
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => paginate(currentPage + 1)}
                                        disabled={currentPage === totalPages}
                                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                                    >
                                        <span className="sr-only">Siguiente</span>
                                        <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
                                    </button>
                                </nav>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function HeaderCell({ label, sortKey, currentSort, dir, onSort }: any) {
    return (
        <th
            scope="col"
            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 group transition-colors"
            onClick={() => onSort(sortKey)}
        >
            <div className="flex items-center gap-1">
                {label}
                {currentSort === sortKey && (
                    dir === 'asc' ? <ArrowUpIcon className="h-3 w-3 text-emerald-600" /> : <ArrowDownIcon className="h-3 w-3 text-emerald-600" />
                )}
            </div>
        </th>
    );
}

function PaymentBadge({ status }: { status: string }) {
    if (status === 'paid') {
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"><CheckCircleIcon className="w-3 h-3 mr-1 text-gray-600" /> Pagado</span>
    }
    if (status === 'pending') {
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"><ClockIcon className="w-3 h-3 mr-1 text-yellow-600" /> Pendiente</span>
    }
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><XCircleIcon className="w-3 h-3 mr-1 text-red-600" /> Fallido</span>
}

function FulfillmentBadge({ status }: { status: string }) {
    if (status === 'fulfilled') {
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Enviado</span>
    }
    if (status === 'partial') {
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Parcial</span>
    }
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">No enviado</span>
}

function SummaryCard({ label, value, color }: { label: string; value: number; color?: string }) {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="text-sm font-medium text-gray-500 mb-1">{label}</div>
            <div className={`text-3xl font-bold ${color || 'text-gray-900'}`}>{value}</div>
        </div>
    );
}
