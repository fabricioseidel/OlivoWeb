"use client";

import React from "react";
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  CloudArrowUpIcon,
} from "@heroicons/react/24/outline";
import type { UberEatsProduct, UberEatsStats } from "../lib";

interface PageHeaderProps {
  isStandalone: boolean;
  handleBack: () => void;
  onOpenFullscreen: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  resetAllChanges: () => void;
  syncing: boolean;
  syncToSupabase: (mode: 'all' | 'selected' | 'from_main') => void;
  products: UberEatsProduct[];
  stats: UberEatsStats;
  excludedProducts: Set<string>;
  restoreExcluded: () => void;
  hasChanges: boolean;
  saving: boolean;
  saveChanges: () => void;
  loadProducts: () => void;
  exporting: boolean;
  exportToCSV: () => void;
  exportModifiedProducts: () => void;
  exportFullListWithMods: () => void;
  exportOriginalList: () => void;
  productModifications: Record<string, Partial<UberEatsProduct>>;
}

export default function PageHeader({
  isStandalone,
  handleBack,
  onOpenFullscreen,
  fileInputRef,
  handleFileSelect,
  resetAllChanges,
  syncing,
  syncToSupabase,
  products,
  stats,
  excludedProducts,
  restoreExcluded,
  hasChanges,
  saving,
  saveChanges,
  loadProducts,
  exporting,
  exportToCSV,
  exportModifiedProducts,
  exportFullListWithMods,
  exportOriginalList,
  productModifications,
}: PageHeaderProps) {
  return (
    <div className="bg-gradient-to-r from-emerald-600 to-green-600 rounded-xl p-6 text-white">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Uber_Eats_2020_logo.svg/1200px-Uber_Eats_2020_logo.svg.png" alt="Uber Eats" className="h-8" />
            Exportar a Uber Eats
          </h1>
          <p className="text-emerald-100 mt-1">
            Prepara tu catálogo de productos para subir a Uber Eats Grocery
          </p>
        </div>
        <div className="flex gap-3">
          {isStandalone && (
            <button
              onClick={handleBack}
              className="px-4 py-2 bg-black/20 hover:bg-black/30 text-white rounded-lg flex items-center gap-2 transition"
              title="Volver"
            >
              ← Volver
            </button>
          )}
          {!isStandalone && (
            <button
              onClick={onOpenFullscreen}
              className="px-4 py-2 bg-black/20 hover:bg-black/30 text-white rounded-lg flex items-center gap-2 transition"
              title="Abrir editor en pantalla completa"
            >
              ⛶ Pantalla completa
            </button>
          )}
          {/* Input oculto para subir imágenes */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
            className="hidden"
          />

          {/* Botón de resetear todos los cambios */}
          <button
            onClick={resetAllChanges}
            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-100 rounded-lg flex items-center gap-2 transition"
            title="Eliminar TODOS los cambios guardados"
          >
            🗑️ Reset Todo
          </button>

          {/* Menú de Sincronización con Supabase */}
          <div className="relative group">
            <button
              disabled={syncing}
              className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-100 rounded-lg flex items-center gap-2 transition disabled:opacity-50"
            >
              <CloudArrowUpIcon className="w-5 h-5" />
              {syncing ? "Sincronizando..." : "Sync Supabase ▼"}
            </button>
            <div className="absolute right-0 mt-1 w-56 bg-white rounded-lg shadow-lg border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
              <button
                onClick={() => syncToSupabase('all')}
                disabled={syncing || products.length === 0}
                className="w-full px-4 py-3 text-left text-sm hover:bg-purple-50 flex items-center gap-2 disabled:opacity-50 border-b"
              >
                <span className="text-lg">📤</span>
                <div>
                  <div className="font-medium text-gray-900">Subir todos</div>
                  <div className="text-xs text-gray-500">{products.length} productos</div>
                </div>
              </button>
              <button
                onClick={() => syncToSupabase('selected')}
                disabled={syncing || stats.exportSelected === 0}
                className="w-full px-4 py-3 text-left text-sm hover:bg-blue-50 flex items-center gap-2 disabled:opacity-50 border-b"
              >
                <span className="text-lg">✅</span>
                <div>
                  <div className="font-medium text-gray-900">Subir seleccionados</div>
                  <div className="text-xs text-gray-500">{stats.exportSelected} productos</div>
                </div>
              </button>
              <button
                onClick={() => syncToSupabase('from_main')}
                disabled={syncing}
                className="w-full px-4 py-3 text-left text-sm hover:bg-green-50 flex items-center gap-2 disabled:opacity-50"
              >
                <span className="text-lg">🔄</span>
                <div>
                  <div className="font-medium text-gray-900">Sync desde Products</div>
                  <div className="text-xs text-gray-500">Desde tabla principal</div>
                </div>
              </button>
            </div>
          </div>

          {excludedProducts.size > 0 && (
            <button
              onClick={restoreExcluded}
              className="px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-100 rounded-lg flex items-center gap-2 transition"
            >
              <ArrowPathIcon className="w-5 h-5" />
              Restaurar ({excludedProducts.size})
            </button>
          )}
          {hasChanges && (
            <button
              onClick={saveChanges}
              disabled={saving}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center gap-2 font-semibold disabled:opacity-50 transition"
            >
              {saving ? "Guardando..." : "💾 Guardar cambios"}
            </button>
          )}
          <button
            onClick={loadProducts}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg flex items-center gap-2 transition"
          >
            <ArrowPathIcon className="w-5 h-5" />
            Recargar
          </button>

          {/* Menú desplegable de exportación */}
          <div className="relative group">
            <button
              className="px-4 py-2 bg-white text-emerald-700 hover:bg-emerald-50 rounded-lg flex items-center gap-2 font-semibold transition"
            >
              <ArrowDownTrayIcon className="w-5 h-5" />
              Exportar CSV ▼
            </button>
            <div className="absolute right-0 mt-1 w-64 bg-white rounded-lg shadow-lg border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
              <button
                onClick={exportToCSV}
                disabled={exporting || stats.exportSelectedValid === 0}
                className="w-full px-4 py-3 text-left text-sm hover:bg-emerald-50 flex items-center gap-2 disabled:opacity-50 border-b"
              >
                <span className="text-lg">🍔</span>
                <div>
                  <div className="font-medium text-gray-900">Uber Eats (Seleccionados)</div>
                  <div className="text-xs text-gray-500">{stats.exportSelectedValid} productos válidos</div>
                </div>
              </button>
              <button
                onClick={exportModifiedProducts}
                disabled={Object.keys(productModifications).length === 0}
                className="w-full px-4 py-3 text-left text-sm hover:bg-orange-50 flex items-center gap-2 disabled:opacity-50 border-b"
              >
                <span className="text-lg">✏️</span>
                <div>
                  <div className="font-medium text-gray-900">Solo Modificados</div>
                  <div className="text-xs text-gray-500">{Object.keys(productModifications).length} productos editados</div>
                </div>
              </button>
              <button
                onClick={exportFullListWithMods}
                className="w-full px-4 py-3 text-left text-sm hover:bg-blue-50 flex items-center gap-2 border-b"
              >
                <span className="text-lg">📋</span>
                <div>
                  <div className="font-medium text-gray-900">Lista Completa (con cambios)</div>
                  <div className="text-xs text-gray-500">{products.length} productos</div>
                </div>
              </button>
              <button
                onClick={exportOriginalList}
                className="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                <span className="text-lg">📁</span>
                <div>
                  <div className="font-medium text-gray-900">Lista Original (sin cambios)</div>
                  <div className="text-xs text-gray-500">Datos del servidor</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
