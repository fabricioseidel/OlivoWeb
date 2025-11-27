"use client";

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  CheckCircleIcon,
  ClockIcon,
  BanknotesIcon,
} from '@heroicons/react/24/outline';
import Button from '@/components/ui/Button';
import { useToast } from '@/contexts/ToastContext';

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
  createdBy?: string;
}

const statusColors = {
  pendiente: 'bg-yellow-100 text-yellow-800',
  confirmado: 'bg-blue-100 text-blue-800',
  enviado_por_whatsapp: 'bg-purple-100 text-purple-800',
  gestionado: 'bg-indigo-100 text-indigo-800',
  recibido: 'bg-green-100 text-green-800',
  cancelado: 'bg-red-100 text-red-800',
};

const paymentStatusColors = {
  pendiente: 'bg-red-100 text-red-800',
  parcial: 'bg-yellow-100 text-yellow-800',
  pagado: 'bg-green-100 text-green-800',
};

const statusLabels = {
  pendiente: 'Pendiente',
  confirmado: 'Confirmado',
  enviado_por_whatsapp: 'Enviado por WhatsApp',
  gestionado: 'Gestionado',
  recibido: 'Recibido',
  cancelado: 'Cancelado',
};

const paymentStatusLabels = {
  pendiente: 'Sin pagar',
  parcial: 'Pago parcial',
  pagado: 'Pagado',
};

export default function SupplierOrdersPage() {
  const { showToast } = useToast();
  const [orders, setOrders] = useState<SupplierOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [paymentFilter, setPaymentFilter] = useState<string>('todos');
  const [dateFilter, setDateFilter] = useState<string>('todos');

  const loadOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/supplier-orders');
      if (!res.ok) throw new Error('Error al cargar pedidos');
      const data = await res.json();
      setOrders(data.orders || []);
    } catch (error) {
      console.error('Error loading orders:', error);
      showToast('Error al cargar pedidos de proveedores', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filtrado
  const filteredOrders = useMemo(() => {
    let filtered = orders;

    // Búsqueda
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(order =>
        order.id.toLowerCase().includes(term) ||
        order.supplierName.toLowerCase().includes(term) ||
        order.notes?.toLowerCase().includes(term)
      );
    }

    // Filtro de estado
    if (statusFilter !== 'todos') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    // Filtro de pago
    if (paymentFilter !== 'todos') {
      filtered = filtered.filter(order => order.paymentStatus === paymentFilter);
    }

    // Filtro de fecha
    const now = new Date();
    if (dateFilter === 'hoy') {
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.orderDate);
        return orderDate.toDateString() === now.toDateString();
      });
    } else if (dateFilter === 'semana') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.orderDate);
        return orderDate >= weekAgo;
      });
    } else if (dateFilter === 'mes') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.orderDate);
        return orderDate >= monthAgo;
      });
    }

    return filtered.sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
  }, [orders, searchTerm, statusFilter, paymentFilter, dateFilter]);

  // Estadísticas
  const stats = useMemo(() => {
    const pending = orders.filter(o => o.status === 'pendiente' || o.status === 'confirmado').length;
    const unpaid = orders.filter(o => o.paymentStatus === 'pendiente').length;
    const thisWeek = orders.filter(o => {
      const orderDate = new Date(o.orderDate);
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return orderDate >= weekAgo;
    }).length;
    const totalPending = orders
      .filter(o => o.paymentStatus !== 'pagado')
      .reduce((sum, o) => sum + o.total, 0);

    return { pending, unpaid, thisWeek, totalPending };
  }, [orders]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pedidos a Proveedores</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gestiona pedidos, pagos y entregas de forma simple y eficiente
          </p>
        </div>
        <Link href="/admin/reabastecimiento">
          <Button>
            <PlusIcon className="h-5 w-5 mr-2" />
            Nuevo Pedido
          </Button>
        </Link>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ClockIcon className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Pedidos Activos</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.pending}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <BanknotesIcon className="h-8 w-8 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Sin Pagar</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.unpaid}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircleIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Esta Semana</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.thisWeek}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <BanknotesIcon className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Pendiente</p>
              <p className="text-2xl font-semibold text-gray-900">
                ${stats.totalPending.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar pedido o proveedor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="todos">Todos los estados</option>
            <option value="pendiente">Pendiente</option>
            <option value="confirmado">Confirmado</option>
            <option value="enviado_por_whatsapp">Enviado por WhatsApp</option>
            <option value="gestionado">Gestionado</option>
            <option value="recibido">Recibido</option>
            <option value="cancelado">Cancelado</option>
          </select>

          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="todos">Todos los pagos</option>
            <option value="pendiente">Sin pagar</option>
            <option value="parcial">Pago parcial</option>
            <option value="pagado">Pagado</option>
          </select>

          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="todos">Todas las fechas</option>
            <option value="hoy">Hoy</option>
            <option value="semana">Última semana</option>
            <option value="mes">Último mes</option>
          </select>

          <button
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('todos');
              setPaymentFilter('todos');
              setDateFilter('todos');
            }}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm hover:bg-gray-50 flex items-center justify-center"
          >
            <FunnelIcon className="h-4 w-4 mr-2" />
            Limpiar
          </button>
        </div>
      </div>

      {/* Tabla de pedidos */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay pedidos</h3>
            <p className="mt-1 text-sm text-gray-500">
              Comienza creando tu primer pedido de reabastecimiento
            </p>
            <div className="mt-6">
              <Link href="/admin/reabastecimiento">
                <Button>
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Crear Pedido
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID / Proveedor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha Pedido
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pago
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Items
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{order.id}</div>
                      <div className="text-sm text-gray-500">{order.supplierName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(order.orderDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[order.status]}`}>
                        {statusLabels[order.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${paymentStatusColors[order.paymentStatus]}`}>
                        {paymentStatusLabels[order.paymentStatus]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ${order.total.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.itemCount} productos
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/admin/pedidos-proveedor/${order.id}`}
                        className="text-blue-600 hover:text-blue-900 inline-flex items-center"
                      >
                        <EyeIcon className="h-5 w-5 mr-1" />
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Resumen de resultados */}
      {!loading && filteredOrders.length > 0 && (
        <div className="text-sm text-gray-500 text-center">
          Mostrando {filteredOrders.length} de {orders.length} pedidos
        </div>
      )}
    </div>
  );
}
