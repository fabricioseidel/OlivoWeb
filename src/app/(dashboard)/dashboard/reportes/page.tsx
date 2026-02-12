"use client";

import { useMemo } from 'react';
import Link from 'next/link';
import { useProducts } from '@/contexts/ProductContext';
import {
  ChartBarIcon,
  ArchiveBoxIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

export default function ReportesPage() {
  const { products } = useProducts();

  const lowStockProducts = useMemo(() => {
    return products.filter(p => p.stock <= 5 && p.stock > 0);
  }, [products]);

  const outOfStockProducts = useMemo(() => {
    return products.filter(p => p.stock === 0);
  }, [products]);

  const totalInventoryValue = useMemo(() => {
    return products.reduce((sum, p) => sum + (p.price * p.stock), 0);
  }, [products]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Centro de Reportes</h1>
        <p className="mt-1 text-sm text-gray-500">
          Análisis e información detallada de tu negocio
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Sales Report Card */}
        <Link href="/dashboard/ventas" className="block group">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-full hover:border-emerald-500 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                <ChartBarIcon className="h-6 w-6 text-blue-600" />
              </div>
              <ArrowTrendingUpIcon className="h-5 w-5 text-gray-400 group-hover:text-emerald-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Reporte de Ventas</h3>
            <p className="text-sm text-gray-500">
              Ver desglose de ingresos, métodos de pago y rendimiento de vendedores.
            </p>
          </div>
        </Link>

        {/* Inventory Report Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-full">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-50 rounded-lg">
              <ArchiveBoxIcon className="h-6 w-6 text-purple-600" />
            </div>
            <span className="text-xs font-medium px-2 py-1 bg-gray-100 rounded-full text-gray-600">
              {products.length} Productos
            </span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Inventario General</h3>
          <div className="space-y-2 mt-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Valor del inventario</span>
              <span className="font-medium text-gray-900">${totalInventoryValue.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Sin stock</span>
              <span className="font-medium text-red-600">{outOfStockProducts.length} productos</span>
            </div>
          </div>
        </div>

        {/* Low Stock Alert */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-full border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-amber-50 rounded-lg">
              <ExclamationTriangleIcon className="h-6 w-6 text-amber-600" />
            </div>
            <span className="text-xs font-medium px-2 py-1 bg-amber-100 rounded-full text-amber-800 animate-pulse">
              Acción requerida
            </span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Alerta de Stock Bajo</h3>
          <p className="text-sm text-gray-500 mb-4">
            Hay {lowStockProducts.length} productos con 5 o menos unidades.
          </p>
          <Link href="/dashboard/productos?filter=low_stock" className="text-sm font-medium text-amber-600 hover:text-amber-800 flex items-center gap-1">
            Ver productos afectados →
          </Link>
        </div>
      </div>

      {/* Low Stock Table */}
      {lowStockProducts.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-amber-50/50 flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
              <ExclamationTriangleIcon className="h-5 w-5 text-amber-500" />
              Productos por Agotarse
            </h3>
            {/* 
            <Link href="/dashboard/reabastecimiento" className="text-sm bg-white border border-gray-300 px-3 py-1 rounded-md hover:bg-gray-50 text-gray-700">
                Gestionar reabastecimiento
            </Link> 
            */}
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoría</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Stock Actual</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Valoración</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {lowStockProducts.slice(0, 5).map(product => (
                  <tr key={product.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.categories?.[0] || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-amber-600">{product.stock}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">${product.price.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {lowStockProducts.length > 5 && (
              <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-center">
                <span className="text-sm text-gray-500">y {lowStockProducts.length - 5} más...</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center text-center">
          <DocumentTextIcon className="h-10 w-10 text-slate-300 mb-2" />
          <h3 className="text-lg font-medium text-slate-900">Reportes Personalizados</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-xs">
            Próximamente podrás generar reportes personalizados por rango de fechas y categorías específicas.
          </p>
        </div>
      </div>
    </div>
  );
}
