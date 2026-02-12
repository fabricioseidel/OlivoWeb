"use client";

import { useMemo, useEffect, useState } from "react";
import Link from "next/link";
import { useProducts } from "@/contexts/ProductContext";
import {
    EyeIcon,
    ArrowUpIcon,
    ArrowDownIcon,
    ArrowPathIcon,
    ShoppingCartIcon,
} from "@heroicons/react/24/outline";

interface LocalOrder {
    id: string;
    total: number;
    items_count: number;
    created_at: string;
    status: string;
    customer?: string;
    email?: string;
}

export default function DashboardPage() {
    const { products } = useProducts();
    const [orders, setOrders] = useState<LocalOrder[]>([]);
    const [lastSync, setLastSync] = useState<string>("");
    const [loading, setLoading] = useState(true);

    // Cargar pedidos desde API
    const loadOrders = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/admin/orders');
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) {
                    setOrders(data);
                    setLastSync(new Date().toLocaleTimeString());
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadOrders();
    }, []);

    const metrics = useMemo(() => {
        const totalViews = products.reduce((sum, p) => sum + (p.viewCount || 0), 0);
        const totalOrderIntents = products.reduce((sum, p) => sum + (p.orderClicks || 0), 0);
        const lowStock = products.filter(p => p.stock > 0 && p.stock <= 5).length;
        const totalOrders = orders.length;

        // Sumar solo pedidos no cancelados para ingresos brutos
        const validOrders = orders.filter(o => o.status !== 'Cancelado');
        const grossRevenue = validOrders.reduce((s, o) => s + (Number(o.total) || 0), 0);
        const itemsSold = validOrders.reduce((s, o) => s + (Number(o.items_count) || 0), 0);
        const avgOrder = validOrders.length ? grossRevenue / validOrders.length : 0;

        // Conversión basada en intentos de pedido -> pedidos confirmados
        const intentConversion = totalOrderIntents ? (totalOrders / totalOrderIntents) * 100 : 0;

        const pendingOrders = orders.filter(o => o.status === 'Pendiente' || o.status === 'En proceso').length;

        return { totalViews, totalOrderIntents, lowStock, totalOrders, grossRevenue, itemsSold, avgOrder, intentConversion, pendingOrders };
    }, [products, orders]);

    const topViewed = useMemo(() => {
        return [...products]
            .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
            .slice(0, 5);
    }, [products]);

    const recentOrders = useMemo(() => {
        return [...orders]
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 5);
    }, [orders]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Resumen</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Vista general del rendimiento de tu tienda
                    </p>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span>Actualizado: {lastSync || '—'}</span>
                    <button onClick={() => loadOrders()} className="p-2 hover:bg-gray-100 rounded-full" title="Refrescar">
                        <ArrowPathIcon className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Tarjetas de estadísticas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Pedidos Totales"
                    value={metrics.totalOrders}
                    icon={<ShoppingCartIcon className="h-6 w-6" />}
                    bgColor="bg-indigo-600"
                    helper={`${metrics.pendingOrders} pendientes`}
                />
                <StatCard
                    title="Ingresos"
                    value={`$${metrics.grossRevenue.toLocaleString('es-CL', { maximumFractionDigits: 0 })}`}
                    icon={<ArrowUpIcon className="h-6 w-6" />}
                    bgColor="bg-emerald-600"
                    helper="Ventas brutas"
                />
                <StatCard
                    title="Ticket Promedio"
                    value={`$${metrics.avgOrder.toLocaleString('es-CL', { maximumFractionDigits: 0 })}`}
                    icon={<ArrowDownIcon className="h-6 w-6" />}
                    bgColor="bg-blue-600"
                    helper="Ingreso / Pedidos"
                />
                <StatCard
                    title="Productos Vistos"
                    value={metrics.totalViews}
                    icon={<EyeIcon className="h-6 w-6" />}
                    bgColor="bg-fuchsia-600"
                    helper={`${metrics.totalOrderIntents} intentos de compra`}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Tabla de pedidos recientes */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                        <h3 className="text-lg font-medium text-gray-900">Pedidos Recientes</h3>
                        <Link href="/dashboard/pedidos" className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">Ver todos</Link>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {recentOrders.map(order => (
                                    <tr key={order.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-emerald-600">
                                            <Link href={`/dashboard/pedidos/${order.id}`}>#{order.id.substring(0, 8)}</Link>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {order.customer || order.email || 'Cliente'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            ${Number(order.total).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <StatusBadge status={order.status} />
                                        </td>
                                    </tr>
                                ))}
                                {recentOrders.length === 0 && (
                                    <tr><td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-500">No hay pedidos recientes.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Top productos */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h3 className="text-lg font-medium text-gray-900">Más Vistos</h3>
                    </div>
                    <div className="divide-y divide-gray-200">
                        {topViewed.map(p => (
                            <div key={p.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50">
                                <div className="flex-1 min-w-0 pr-4">
                                    <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                                    <p className="text-xs text-gray-500 truncate">{Array.isArray(p.categories) ? p.categories[0] : ''}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <EyeIcon className="h-4 w-4 text-gray-400" />
                                    <span className="text-sm font-medium text-gray-900">{p.viewCount}</span>
                                </div>
                            </div>
                        ))}
                        {topViewed.length === 0 && (
                            <div className="px-6 py-8 text-center text-sm text-gray-500">Sin datos de productos.</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, icon, bgColor, helper }: { title: string; value: string | number; icon: React.ReactNode; bgColor: string; helper?: string; }) {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 overflow-hidden">
            <div className="flex items-start gap-4">
                <div className={`flex-shrink-0 rounded-lg p-3 ${bgColor} text-white shadow-sm`}>{icon}</div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-500 truncate">{title}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
                    {helper && <p className="text-xs text-gray-400 mt-1 truncate">{helper}</p>}
                </div>
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const map: Record<string, string> = {
        'Pendiente': 'bg-gray-100 text-gray-700',
        'En proceso': 'bg-yellow-100 text-yellow-700',
        'Procesando': 'bg-yellow-100 text-yellow-700',
        'Enviado': 'bg-blue-100 text-blue-700',
        'Gestionado': 'bg-indigo-100 text-indigo-700',
        'Completado': 'bg-emerald-100 text-emerald-700',
        'Cancelado': 'bg-red-100 text-red-700'
    };
    return <span className={`px-2 py-0.5 inline-flex text-xs font-semibold rounded-full ${map[status] || 'bg-gray-100 text-gray-600'}`}>{status}</span>;
}
