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
  XMarkIcon,
  CurrencyDollarIcon,
  DocumentArrowUpIcon
} from '@heroicons/react/24/outline';
import { useToast } from "@/contexts/ToastContext";

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
  
  // Modal State
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  const { showToast } = useToast();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Filters setup
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all'>('all');
  const [sellerFilter, setSellerFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Extracción de datos
  useEffect(() => {
    loadSales();
    loadSellers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFilter, sellerFilter, paymentFilter]);

  const loadSales = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

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
      if (!response.ok) throw new Error("Error fetching sales");
      const data = await response.json();

      if (data.sales) {
        setSales(data.sales);
      }
    } catch (error) {
      showToast('Error al cargar ventas', 'error');
      console.error('Error loading sales:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSellers = async () => {
    try {
      const response = await fetch('/api/sellers');
      if (!response.ok) return;
      const data = await response.json();
      if (data.sellers) setSellers(data.sellers);
    } catch (error) {
      console.error('Error loading sellers:', error);
    }
  };

  const loadSaleDetail = async (saleId: number) => {
    try {
      setDetailLoading(true);
      const response = await fetch(`/api/sales/${saleId}`);
      if (!response.ok) throw new Error("No se pudo cargar el detalle");
      const data = await response.json();
      if (data.items) setSaleItems(data.items);
    } catch (error) {
      showToast('Error al cargar detalle', 'error');
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

      if (!response.ok) throw new Error(data.error || 'Error al subir comprobante');
      
      showToast('Comprobante subido exitosamente', 'success');

      // Reload
      await loadSales();
      if (selectedSale) {
        const updatedResponse = await fetch(`/api/sales/${saleId}`);
        const updatedData = await updatedResponse.json();
        setSelectedSale(updatedData.sale);
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Error al subir comprobante', 'error');
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
      if (file) handleUploadReceipt(saleId, file);
    };
    input.click();
  };

  // Searching logic
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

  // Statistics
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
      if (!acc[seller]) acc[seller] = { count: 0, total: 0 };
      acc[seller].count++;
      acc[seller].total += sale.total;
      return acc;
    }, {} as Record<string, { count: number; total: number }>);

    return { totalSales, totalRevenue, avgSale, byPaymentMethod, bySeller };
  }, [filteredSales]);

  // Export
  const exportToCSV = () => {
    if (filteredSales.length === 0) {
      showToast('No hay ventas para exportar', 'error');
      return;
    }
    
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
      (sale.notes || '').replace(/,/g, ' ') // protect CSV
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Ventas_MINIMARKET_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    showToast('Reporte exportado exitosamente', 'success');
  };

  const getMethodBadge = (method: string) => {
    const m = (method || '').toLowerCase();
    if (m.includes('efectivo') || m === 'cash') return 'bg-emerald-50 text-emerald-600 border-emerald-100';
    if (m.includes('tarjeta') || m === 'card' || m === 'debito' || m === 'credito') return 'bg-amber-50 text-amber-600 border-amber-100';
    if (m.includes('transfer')) return 'bg-blue-50 text-blue-600 border-blue-100';
    return 'bg-gray-50 text-gray-500 border-gray-100';
  };

  return (
    <div className="-m-4 sm:-m-8">
      {/* ── Premium Admin Header ── */}
      <div className="bg-emerald-950 p-8 sm:p-12 mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[120px]" />
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-end sm:items-center gap-6">
            <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 backdrop-blur-md rounded-full text-emerald-400 text-[10px] font-black uppercase tracking-widest mb-4 border border-white/5">
                    <BanknotesIcon className="size-3" />
                    <span>Control de Ingresos</span>
                </div>
                <h1 className="text-4xl font-black text-white tracking-tight">Historial de Ventas</h1>
                <p className="mt-2 text-emerald-100/50 font-medium italic">
                    Registro detallado del POS físico y despachos
                </p>
            </div>
            <div className="flex items-center gap-3">
                <button 
                  onClick={exportToCSV}
                  className="px-6 py-3 bg-emerald-500 rounded-2xl text-emerald-950 text-xs font-black uppercase tracking-widest hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
                >
                    <ArrowDownTrayIcon className="size-4" />
                    Exportar Reporte
                </button>
            </div>
        </div>
      </div>

      <div className="px-4 sm:px-8 pb-12 space-y-8">
        
        {/* Estadísticas Hero */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-white rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-500 group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full blur-3xl opacity-50 -mr-12 -mt-12 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-4">
                  <div className="p-3 rounded-2xl bg-blue-600 shadow-blue-200 text-white shadow-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                      <ChartBarIcon className="w-6 h-6" />
                  </div>
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">Volumen Operativo</h3>
                <p className="text-3xl font-black text-gray-900 tracking-tight">{stats.totalSales} Ventas</p>
              </div>
            </div>
          </div>
          
          <div className="p-6 bg-white rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-500 group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full blur-3xl opacity-50 -mr-12 -mt-12 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-4">
                  <div className="p-3 rounded-2xl bg-emerald-600 shadow-emerald-200 text-white shadow-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                      <BanknotesIcon className="w-6 h-6" />
                  </div>
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">Flujo Generado</h3>
                <p className="text-3xl font-black text-gray-900 tracking-tight">${stats.totalRevenue.toLocaleString()}</p>
              </div>
            </div>
          </div>
          
          <div className="p-6 bg-white rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-500 group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-full blur-3xl opacity-50 -mr-12 -mt-12 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-4">
                  <div className="p-3 rounded-2xl bg-amber-500 shadow-amber-200 text-white shadow-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                      <CurrencyDollarIcon className="w-6 h-6" />
                  </div>
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">Ticket Promedio</h3>
                <p className="text-3xl font-black text-gray-900 tracking-tight">${stats.avgSale.toLocaleString('es-CL', { maximumFractionDigits: 0 })}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Filtros Activos ── */}
        <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-5 w-5 text-emerald-500" />
                </div>
                <input
                    type="text"
                    className="block w-full pl-11 pr-4 py-4 bg-gray-50 border-none rounded-2xl text-sm font-bold text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
                    placeholder="Buscar por #ID, método o vendedor..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="flex gap-2 w-full lg:w-auto overflow-x-auto pb-1 lg:pb-0 scrollbar-hide snap-x snap-mandatory">
              <div className="relative min-w-[150px]">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <CalendarIcon className="h-4 w-4 text-emerald-500" />
                </div>
                <select
                    className="block w-full pl-11 pr-8 py-4 bg-gray-50 border-none rounded-2xl text-xs font-bold text-gray-900 focus:ring-2 focus:ring-emerald-500 transition-all appearance-none cursor-pointer outline-none"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value as any)}
                >
                    <option value="all">Todas las fechas</option>
                    <option value="today">Día de Hoy</option>
                    <option value="week">Última Semana</option>
                    <option value="month">Último Mes</option>
                </select>
              </div>

              <div className="relative min-w-[150px]">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <UserIcon className="h-4 w-4 text-emerald-500" />
                </div>
                <select
                    className="block w-full pl-11 pr-8 py-4 bg-gray-50 border-none rounded-2xl text-xs font-bold text-gray-900 focus:ring-2 focus:ring-emerald-500 transition-all appearance-none cursor-pointer outline-none"
                    value={sellerFilter}
                    onChange={(e) => setSellerFilter(e.target.value)}
                >
                    <option value="all">Todo el equipo</option>
                    {sellers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div className="relative min-w-[150px]">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <CreditCardIcon className="h-4 w-4 text-emerald-500" />
                </div>
                <select
                    className="block w-full pl-11 pr-8 py-4 bg-gray-50 border-none rounded-2xl text-xs font-bold text-gray-900 focus:ring-2 focus:ring-emerald-500 transition-all appearance-none cursor-pointer outline-none"
                    value={paymentFilter}
                    onChange={(e) => setPaymentFilter(e.target.value)}
                >
                    <option value="all">Todos los medios</option>
                    <option value="efectivo">Efectivo 💵</option>
                    <option value="card">Tarjetas 💳</option>
                    <option value="transfer">Transferencia 📲</option>
                </select>
              </div>
            </div>
        </div>

        {/* ── Desglose Secundario ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6 lg:p-8">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-6 flex items-center gap-2"><CreditCardIcon className="size-4" /> Distribución por Método</h3>
            <div className="space-y-4">
              {Object.keys(stats.byPaymentMethod).length === 0 && <span className="text-xs font-medium text-gray-400">Sin métodos para este periodo</span>}
              {Object.entries(stats.byPaymentMethod).map(([method, total]) => (
                <div key={method} className="flex justify-between items-center bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                  <span className="text-sm font-bold text-gray-700 capitalize">{method}</span>
                  <span className="text-sm font-black text-emerald-600">${total.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6 lg:p-8">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-6 flex items-center gap-2"><UserIcon className="size-4" /> Rendimiento de Empleados</h3>
            <div className="space-y-4 max-h-[220px] overflow-y-auto pr-2">
              {Object.keys(stats.bySeller).length === 0 && <span className="text-xs font-medium text-gray-400">Sin actividad</span>}
              {Object.entries(stats.bySeller).map(([seller, data]) => (
                <div key={seller} className="flex justify-between items-center bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-gray-700">{seller}</span>
                    <span className="text-[10px] uppercase font-black text-gray-400 tracking-widest">{data.count} Transacciones</span>
                  </div>
                  <span className="text-sm font-black text-blue-600">${data.total.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Tabla Principal de Ventas ── */}
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden relative">
          {loading && (
             <div className="absolute inset-0 bg-white/70 backdrop-blur-sm z-20 flex items-center justify-center">
                 <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500"></div>
             </div>
          )}
          
          {/* Vista Móvil (Cards) */}
          <div className="md:hidden divide-y divide-gray-100">
            {filteredSales.map((sale) => {
              const isTransfer = sale.payment_method?.toLowerCase().includes('transfer');
              const hasReceipt = !!sale.transfer_receipt_uri;
              return (
                <div key={sale.id} className="p-4 flex flex-col gap-3" onClick={() => handleSaleClick(sale)}>
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-gray-900 line-clamp-1">#{sale.id}</span>
                      <span className="text-[10px] text-gray-400 font-medium">{new Date(sale.ts).toLocaleString()}</span>
                    </div>
                    <span className="text-base font-black text-gray-900">${sale.total.toLocaleString()}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                       <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-black text-[10px] uppercase border border-blue-100">
                         {(sale.seller_name || 'A')[0]}
                       </div>
                       <span className="text-xs font-bold text-gray-700">{sale.seller_name || 'N/A'}</span>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-lg border ${getMethodBadge(sale.payment_method)}`}>
                        {sale.payment_method || 'N/A'}
                      </span>
                      {isTransfer && (
                         <span className={`text-[8px] font-bold tracking-widest uppercase ${hasReceipt ? 'text-emerald-500' : 'text-rose-500'}`}>
                           {hasReceipt ? '✓ CON comprobante' : '⚠ Faltan datos'}
                         </span>
                       )}
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredSales.length === 0 && !loading && (
              <div className="py-10 text-center text-gray-400 text-xs">Ninguna venta encontrada</div>
            )}
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50/80">
                <tr>
                  <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    ID Transacción
                  </th>
                  <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Operador
                  </th>
                  <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Método
                  </th>
                  <th className="px-8 py-5 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Monto
                  </th>
                  <th className="px-8 py-5 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest rounded-tr-[2.5rem]">
                    Detalles
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-50">
                {filteredSales.map((sale) => {
                  const isTransfer = sale.payment_method?.toLowerCase().includes('transfer');
                  const hasReceipt = !!sale.transfer_receipt_uri;
                  
                  return (
                    <tr key={sale.id} className="hover:bg-emerald-50/30 transition-colors group">
                      <td className="px-8 py-5 whitespace-nowrap">
                        <div className="flex flex-col">
                           <span className="text-sm font-bold text-gray-900 group-hover:text-emerald-700 transition-colors">#{sale.id}</span>
                           <span className="text-[10px] text-gray-400 font-medium tracking-wide">{new Date(sale.ts).toLocaleString()}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-black text-xs uppercase shadow-inner border border-blue-100">
                             {(sale.seller_name || 'A')[0]}
                           </div>
                           <div className="flex flex-col">
                             <span className="text-sm font-bold text-gray-700">{sale.seller_name || 'N/A'}</span>
                             <span className="text-[10px] text-gray-400 truncate max-w-[120px]">{sale.seller_email}</span>
                           </div>
                        </div>
                      </td>
                      <td className="px-8 py-5 whitespace-nowrap">
                        <div className="flex flex-col items-start gap-1">
                           <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg border ${getMethodBadge(sale.payment_method)}`}>
                             {sale.payment_method || 'N/A'}
                           </span>
                           {isTransfer && (
                             <span className={`text-[9px] font-bold tracking-widest uppercase ${hasReceipt ? 'text-emerald-500' : 'text-rose-500'}`}>
                               {hasReceipt ? '✓ CON comprobante' : '⚠ Faltan datos'}
                             </span>
                           )}
                        </div>
                      </td>
                      <td className="px-8 py-5 whitespace-nowrap text-right">
                        <span className="text-base font-black text-gray-900">${sale.total.toLocaleString()}</span>
                      </td>
                      <td className="px-8 py-5 whitespace-nowrap text-center">
                        <button
                          onClick={() => handleSaleClick(sale)}
                          className="inline-flex items-center justify-center p-2.5 bg-gray-50 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                          title="Inspeccionar Venta"
                        >
                          <EyeIcon className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filteredSales.length === 0 && !loading && (
                    <tr>
                        <td colSpan={5} className="py-16 text-center">
                            <DocumentArrowUpIcon className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                            <p className="text-sm font-bold text-gray-500">Ninguna Venta Encontrada</p>
                            <p className="text-xs text-gray-400 mt-1">Busque otro criterio de fecha o método</p>
                        </td>
                    </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* ── Modal Premium de Detalle ── */}
      {selectedSale && mounted && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center px-4 sm:px-0" onClick={() => setSelectedSale(null)}>
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" />
          
          <div 
            className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col transform transition-all overflow-hidden border border-gray-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-1">Recibo de Operación</p>
                <h3 className="text-2xl font-black text-slate-900">Venta #{selectedSale.id}</h3>
                <p className="text-xs text-slate-500 font-medium">{new Date(selectedSale.ts).toLocaleString()}</p>
              </div>
              <button
                onClick={() => setSelectedSale(null)}
                className="p-3 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors rounded-2xl"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-6">
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-6 rounded-3xl border border-gray-100">
                <div>
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Empleado</span>
                    <span className="text-sm font-bold text-slate-800">{selectedSale.seller_name || 'Mostrador'}</span>
                </div>
                <div>
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Método</span>
                    <span className="text-sm font-bold text-slate-800 capitalize">{selectedSale.payment_method || 'Genérico'}</span>
                </div>
                <div>
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Terminal/ID</span>
                    <span className="text-xs font-mono text-slate-600 truncate">{selectedSale.client_sale_id.split('-')[0]}..</span>
                </div>
                <div>
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Caja/Device</span>
                    <span className="text-xs font-mono text-slate-600 truncate">{selectedSale.device_id.slice(-6)}</span>
                </div>
                <div className="col-span-4 h-px bg-gray-200/50 my-2" />
                <div>
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Cobrado</span>
                    <span className="text-sm font-bold text-emerald-600">${selectedSale.cash_received}</span>
                </div>
                <div>
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Vuelto</span>
                    <span className="text-sm font-bold text-amber-600">${selectedSale.change_given}</span>
                </div>
                <div>
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Descuento</span>
                    <span className="text-sm font-bold text-rose-600">${selectedSale.discount}</span>
                </div>
                <div>
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Impuesto</span>
                    <span className="text-sm font-bold text-slate-800">${selectedSale.tax}</span>
                </div>
                
                {selectedSale.notes && (
                  <div className="col-span-4 mt-2">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Notas Opcionales</span>
                    <div className="p-3 bg-white rounded-xl text-xs font-medium text-slate-600 italic border border-slate-100">
                      {selectedSale.notes}
                    </div>
                  </div>
                )}
              </div>

              {selectedSale.payment_method?.toLowerCase().includes('transferencia') && (
                <div className="bg-blue-50/50 border border-blue-100 rounded-3xl p-6">
                  <div className="flex items-center justify-between mb-4">
                     <h4 className="text-sm font-black text-blue-900 flex items-center gap-2">
                         <DocumentArrowUpIcon className="size-5 text-blue-500" /> Adjunto de Transferencia
                     </h4>
                     <button
                        onClick={() => handleFileSelect(selectedSale.id)}
                        disabled={uploadingReceipt}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 transition-colors text-white font-black text-[10px] uppercase tracking-widest rounded-xl disabled:opacity-50"
                     >
                        {uploadingReceipt ? 'Procesando..' : 'Cambiar / Subir'}
                     </button>
                  </div>
                  
                  {selectedSale.transfer_receipt_uri ? (
                    <div className="relative w-full h-64 rounded-xl overflow-hidden border-2 border-dashed border-blue-200 bg-white group cursor-pointer" onClick={() => window.open(selectedSale.transfer_receipt_uri as string)}>
                        <div className="absolute inset-0 bg-blue-900/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10">
                            <span className="bg-blue-600 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-lg">AMPLIAR IMAGEN</span>
                        </div>
                        <Image src={selectedSale.transfer_receipt_uri} alt="Comprobante Transferencia" fill className="object-contain" />
                    </div>
                  ) : (
                    <div className="w-full h-32 rounded-xl border-2 border-dashed border-blue-200 bg-blue-50 flex flex-col items-center justify-center text-blue-400">
                        <DocumentArrowUpIcon className="size-8 opacity-50 mb-2" />
                        <span className="text-xs font-bold uppercase tracking-widest">Aún sin captura validada</span>
                    </div>
                  )}
                </div>
              )}

              {/* Items Lista */}
              <div>
                <h4 className="text-sm font-black text-slate-900 mb-4 flex items-center gap-2"><ShoppingBagIcon className="size-5 text-emerald-500"/> Artículos Entregados</h4>
                <div className="border border-slate-100 rounded-3xl overflow-hidden">
                    {detailLoading ? (
                        <div className="p-10 flex justify-center bg-slate-50"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500" /></div>
                    ) : saleItems.length === 0 ? (
                        <div className="p-8 text-center bg-slate-50 text-xs font-bold text-slate-400 tracking-widest uppercase">Sin detalles de SKU guardados</div>
                    ) : (
                        <table className="min-w-full divide-y divide-gray-100">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Cant.</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Item</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Precio Base</th>
                                    <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Subtotal</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {saleItems.map(it => (
                                    <tr key={it.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-emerald-600">x{it.quantity}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-slate-800">{it.product_name}</span>
                                                <span className="text-[10px] text-slate-400 font-mono tracking-wider">{it.product_barcode}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-500">${it.unit_price}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-slate-900 text-right">${it.subtotal}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-emerald-50 border-t border-emerald-100">
                                <tr>
                                    <td colSpan={3} className="px-6 py-4 text-right text-[10px] font-black tracking-widest uppercase text-emerald-600">Sumatorio Total</td>
                                    <td className="px-6 py-4 text-right text-lg font-black text-emerald-700">${selectedSale.total.toLocaleString()}</td>
                                </tr>
                            </tfoot>
                        </table>
                    )}
                </div>
              </div>
            </div>
            
            <div className="px-8 py-5 border-t border-gray-100 bg-slate-50 flex justify-end">
                <button
                  onClick={() => setSelectedSale(null)}
                  className="px-8 py-3 bg-slate-200 text-slate-600 rounded-xl hover:bg-slate-300 font-black text-xs uppercase tracking-widest transition-all"
                >
                  Cerrar Visualizador
                </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// Just isolated component shim
function ShoppingBagIcon(props: any) {
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
  );
}
