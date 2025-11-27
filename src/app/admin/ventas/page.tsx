"use client";

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { createPortal } from 'react-dom';
import {
  MagnifyingGlassIcon,
  CalendarIcon,
  CreditCardIcon,
  UserIcon,
  BanknotesIcon,
  ChartBarIcon,
  ArrowDownTrayIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';

interface Sale {
  id: number;
  ts: string;
  total: number;
  payment_method: string;
  cash_received: number;
  change_given: number;
  discount: number;
  tax: number;
  notes: string;
  voided: boolean;
  device_id: string;
  client_sale_id: string;
  seller_id: string;
  seller_name: string | null;
  seller_email: string | null;
  transfer_receipt_uri: string | null;
  transfer_receipt_name: string | null;
}

interface SaleItem {
  id: number;
  sale_id: number;
  product_barcode: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  discount: number;
}

interface Seller {
  id: string;
  name: string;
  email: string | null;
}

export default function VentasPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Filtros
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all'>('all');
  const [sellerFilter, setSellerFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Cargar ventas
  useEffect(() => {
    loadSales();
    loadSellers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFilter, sellerFilter, paymentFilter]);

  const loadSales = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      // Filtro de fecha
      const now = new Date();
      if (dateFilter === 'today') {
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        params.append('startDate', today.toISOString());
      } else if (dateFilter === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        params.append('startDate', weekAgo.toISOString());
      } else if (dateFilter === 'month') {
        const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        params.append('startDate', monthAgo.toISOString());
      }

      if (sellerFilter !== 'all') {
        params.append('sellerId', sellerFilter);
      }

      if (paymentFilter !== 'all') {
        params.append('paymentMethod', paymentFilter);
      }

      const response = await fetch(`/api/sales?${params.toString()}`);
      const data = await response.json();
      
      if (data.sales) {
        setSales(data.sales);
      }
    } catch (error) {
      console.error('Error loading sales:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSellers = async () => {
    try {
      const response = await fetch('/api/sellers');
      const data = await response.json();
      
      if (data.sellers) {
        setSellers(data.sellers);
      }
    } catch (error) {
      console.error('Error loading sellers:', error);
    }
  };

  const loadSaleDetail = async (saleId: number) => {
    try {
      setDetailLoading(true);
      const response = await fetch(`/api/sales/${saleId}`);
      const data = await response.json();
      
      if (data.items) {
        setSaleItems(data.items);
      }
    } catch (error) {
      console.error('Error loading sale detail:', error);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSaleClick = (sale: Sale) => {
    setSelectedSale(sale);
    loadSaleDetail(sale.id);
  };

  const handleUploadReceipt = async (saleId: number, file: File) => {
    try {
      setUploadingReceipt(true);
      
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/sales/${saleId}/upload-receipt`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al subir comprobante');
      }

      alert('Comprobante subido exitosamente');
      
      // Recargar ventas y detalle
      await loadSales();
      if (selectedSale) {
        const updatedResponse = await fetch(`/api/sales/${saleId}`);
        const updatedData = await updatedResponse.json();
        setSelectedSale(updatedData.sale);
      }
    } catch (error) {
      console.error('Error uploading receipt:', error);
      alert(error instanceof Error ? error.message : 'Error al subir comprobante');
    } finally {
      setUploadingReceipt(false);
    }
  };

  const handleFileSelect = (saleId: number) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        handleUploadReceipt(saleId, file);
      }
    };
    input.click();
  };

  // Filtrado por búsqueda
  const filteredSales = useMemo(() => {
    if (!searchTerm) return sales;
    
    const term = searchTerm.toLowerCase();
    return sales.filter(sale => 
      sale.id.toString().includes(term) ||
      sale.seller_name?.toLowerCase().includes(term) ||
      sale.seller_email?.toLowerCase().includes(term) ||
      sale.payment_method?.toLowerCase().includes(term) ||
      sale.client_sale_id?.toLowerCase().includes(term)
    );
  }, [sales, searchTerm]);

  // Estadísticas
  const stats = useMemo(() => {
    const totalSales = filteredSales.length;
    const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
    const avgSale = totalSales > 0 ? totalRevenue / totalSales : 0;
    
    const byPaymentMethod = filteredSales.reduce((acc, sale) => {
      const method = sale.payment_method || 'desconocido';
      acc[method] = (acc[method] || 0) + sale.total;
      return acc;
    }, {} as Record<string, number>);

    const bySeller = filteredSales.reduce((acc, sale) => {
      const seller = sale.seller_name || 'Desconocido';
      if (!acc[seller]) {
        acc[seller] = { count: 0, total: 0 };
      }
      acc[seller].count++;
      acc[seller].total += sale.total;
      return acc;
    }, {} as Record<string, { count: number; total: number }>);

    return {
      totalSales,
      totalRevenue,
      avgSale,
      byPaymentMethod,
      bySeller,
    };
  }, [filteredSales]);

  // Exportar a CSV
  const exportToCSV = () => {
    const headers = ['ID', 'Fecha', 'Total', 'Método Pago', 'Vendedor', 'Email Vendedor', 'Efectivo Recibido', 'Cambio', 'Descuento', 'Impuesto', 'Notas'];
    const rows = filteredSales.map(sale => [
      sale.id,
      new Date(sale.ts).toLocaleString(),
      sale.total,
      sale.payment_method || '',
      sale.seller_name || '',
      sale.seller_email || '',
      sale.cash_received || 0,
      sale.change_given || 0,
      sale.discount || 0,
      sale.tax || 0,
      sale.notes || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `ventas_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Ventas del Minimarket</h1>
        <p className="mt-1 text-sm text-gray-500">
          Historial completo de ventas sincronizadas desde la app móvil
        </p>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ChartBarIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Ventas</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalSales}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <BanknotesIcon className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Ingresos Totales</p>
              <p className="text-2xl font-semibold text-gray-900">
                ${stats.totalRevenue.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CreditCardIcon className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Ticket Promedio</p>
              <p className="text-2xl font-semibold text-gray-900">
                ${stats.avgSale.toFixed(0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros y búsqueda */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Búsqueda */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar ventas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          {/* Filtro de fecha */}
          <div className="relative">
            <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="all">Todas las fechas</option>
              <option value="today">Hoy</option>
              <option value="week">Última semana</option>
              <option value="month">Último mes</option>
            </select>
          </div>

          {/* Filtro de vendedor */}
          <div className="relative">
            <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <select
              value={sellerFilter}
              onChange={(e) => setSellerFilter(e.target.value)}
              className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="all">Todos los vendedores</option>
              {sellers.map(seller => (
                <option key={seller.id} value={seller.id}>
                  {seller.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro de método de pago */}
          <div className="relative">
            <CreditCardIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="all">Todos los métodos</option>
              <option value="efectivo">Efectivo</option>
              <option value="debito">Débito</option>
              <option value="credito">Crédito</option>
              <option value="transferencia">Transferencia</option>
            </select>
          </div>
        </div>

        {/* Botón de exportar */}
        <div className="mt-4 flex justify-end">
          <button
            onClick={exportToCSV}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Resumen por método de pago */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Por Método de Pago</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(stats.byPaymentMethod).map(([method, total]) => (
            <div key={method} className="border rounded-lg p-4">
              <p className="text-sm text-gray-500 capitalize">{method}</p>
              <p className="text-xl font-semibold text-gray-900">
                ${total.toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Resumen por vendedor */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Por Vendedor</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vendedor
                </th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ventas
                </th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Promedio
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Object.entries(stats.bySeller).map(([seller, data]) => (
                <tr key={seller}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {seller}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {data.count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${data.total.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${(data.total / data.count).toFixed(0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tabla de ventas */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Historial de Ventas ({filteredSales.length})
          </h3>
        </div>

        {loading ? (
          <div className="flex justify-center items-center p-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredSales.length === 0 ? (
          <div className="text-center p-12 text-gray-500">
            No se encontraron ventas
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vendedor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Método Pago
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSales.map((sale) => {
                  // Determinar el color de fondo según el estado del comprobante
                  const isTransfer = sale.payment_method === 'transferencia';
                  const hasReceipt = sale.transfer_receipt_uri;
                  let rowBgClass = 'hover:bg-gray-50';
                  
                  if (isTransfer && !hasReceipt) {
                    rowBgClass = 'bg-red-50 hover:bg-red-100'; // Transferencia sin comprobante
                  } else if (isTransfer && hasReceipt) {
                    rowBgClass = 'bg-green-50 hover:bg-green-100'; // Transferencia con comprobante
                  }

                  return (
                    <tr key={sale.id} className={rowBgClass}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {sale.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{sale.seller_name || 'N/A'}</div>
                        <div className="text-xs text-gray-500">{sale.seller_email || ''}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 capitalize">
                          {sale.payment_method || 'N/A'}
                        </span>
                        {isTransfer && (
                          <div className="mt-1 text-xs">
                            {hasReceipt ? (
                              <span className="text-green-600 font-medium">✓ Con comprobante</span>
                            ) : (
                              <span className="text-red-600 font-medium">⚠ Sin comprobante</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        ${sale.total.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => handleSaleClick(sale)}
                          className="inline-flex items-center px-3 py-1.5 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors"
                          title="Ver detalle"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de detalle */}
      {selectedSale && mounted && createPortal(
        <>
          <div 
            className="fixed inset-0 bg-gray-900 bg-opacity-60 backdrop-blur-sm" 
            style={{ 
              zIndex: 99998,
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0
            }}
            onClick={() => setSelectedSale(null)}
          />
          <div 
            className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none" 
            style={{ zIndex: 99999 }}
          >
            <div 
              className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto relative pointer-events-auto" 
              onClick={(e) => e.stopPropagation()}
            >
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    Detalle de Venta #{selectedSale.id}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {new Date(selectedSale.ts).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedSale(null)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <span className="sr-only">Cerrar</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="px-6 py-4">
              {/* Información de la venta */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm font-medium text-gray-500">Vendedor</p>
                  <p className="text-sm text-gray-900">{selectedSale.seller_name || 'N/A'}</p>
                  <p className="text-xs text-gray-500">{selectedSale.seller_email || ''}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Método de Pago</p>
                  <p className="text-sm text-gray-900 capitalize">{selectedSale.payment_method || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Efectivo Recibido</p>
                  <p className="text-sm text-gray-900">${selectedSale.cash_received || 0}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Cambio Entregado</p>
                  <p className="text-sm text-gray-900">${selectedSale.change_given || 0}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Descuento</p>
                  <p className="text-sm text-gray-900">${selectedSale.discount || 0}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Impuesto</p>
                  <p className="text-sm text-gray-900">${selectedSale.tax || 0}</p>
                </div>
                {selectedSale.notes && (
                  <div className="col-span-2">
                    <p className="text-sm font-medium text-gray-500">Notas</p>
                    <p className="text-sm text-gray-900">{selectedSale.notes}</p>
                  </div>
                )}
                <div className="col-span-2">
                  <p className="text-sm font-medium text-gray-500">ID Local</p>
                  <p className="text-xs text-gray-500 font-mono">{selectedSale.client_sale_id}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm font-medium text-gray-500">Dispositivo</p>
                  <p className="text-xs text-gray-500 font-mono">{selectedSale.device_id}</p>
                </div>
              </div>

              {/* Comprobante de transferencia */}
              {selectedSale.payment_method?.toLowerCase() === 'transferencia' && (
                <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Comprobante de Transferencia</h4>
                  {selectedSale.transfer_receipt_uri ? (
                    <div>
                      <div className="mb-2 relative w-full h-96">
                        <Image 
                          src={selectedSale.transfer_receipt_uri} 
                          alt="Comprobante" 
                          fill
                          className="object-contain rounded border border-gray-300"
                        />
                      </div>
                      <div className="flex gap-3 flex-wrap">
                        <a
                          href={selectedSale.transfer_receipt_uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm font-medium"
                        >
                          Ver en tamaño completo
                        </a>
                        <button
                          onClick={() => handleFileSelect(selectedSale.id)}
                          disabled={uploadingReceipt}
                          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                        >
                          {uploadingReceipt ? 'Subiendo...' : 'Reemplazar comprobante'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-gray-500 mb-3">
                        No se ha cargado comprobante para esta transferencia
                      </p>
                      <button
                        onClick={() => handleFileSelect(selectedSale.id)}
                        disabled={uploadingReceipt}
                        className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium shadow-sm"
                      >
                        {uploadingReceipt ? 'Subiendo...' : '📤 Subir comprobante'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Items de la venta */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Productos Vendidos</h4>
                {detailLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                  </div>
                ) : saleItems.length === 0 ? (
                  <p className="text-sm text-gray-500">No se encontraron items</p>
                ) : (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Código
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Producto
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Cantidad
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Precio Unit.
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Subtotal
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {saleItems.map((item) => (
                        <tr key={item.id}>
                          <td className="px-4 py-2 text-sm text-gray-900">{item.product_barcode}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{item.product_name}</td>
                          <td className="px-4 py-2 text-sm text-gray-500">{item.quantity}</td>
                          <td className="px-4 py-2 text-sm text-gray-500">${item.unit_price}</td>
                          <td className="px-4 py-2 text-sm font-medium text-gray-900">
                            ${item.subtotal}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td colSpan={4} className="px-4 py-2 text-sm font-medium text-gray-900 text-right">
                          Total:
                        </td>
                        <td className="px-4 py-2 text-sm font-bold text-gray-900">
                          ${selectedSale.total}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
              <button
                onClick={() => setSelectedSale(null)}
                className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
        </>,
        document.body
      )}
    </div>
  );
}
