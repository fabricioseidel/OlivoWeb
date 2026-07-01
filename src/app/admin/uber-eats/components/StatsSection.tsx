"use client";

import React from "react";
import { log, type UberEatsProduct, type UberEatsStats } from "../lib";

interface StatsSectionProps {
  stats: UberEatsStats;
  excludedProducts: Set<string>;
  productModifications: Record<string, Partial<UberEatsProduct>>;
  customCategories: string[];
  products: UberEatsProduct[];
}

export default function StatsSection({
  stats,
  excludedProducts,
  productModifications,
  customCategories,
  products,
}: StatsSectionProps) {
  return (
    <>
      {/* Estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-500">Total productos</div>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <div className="text-2xl font-bold text-emerald-600">{stats.exportSelected}</div>
          <div className="text-sm text-gray-500">Para exportar</div>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <div className="text-2xl font-bold text-green-600">{stats.valid}</div>
          <div className="text-sm text-gray-500">Válidos</div>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <div className="text-2xl font-bold text-red-600">{stats.invalid}</div>
          <div className="text-sm text-gray-500">Con errores</div>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <div className="text-2xl font-bold text-blue-600">{stats.exportSelectedValid}</div>
          <div className="text-sm text-gray-500">Listos para exportar</div>
        </div>
      </div>

      {/* BARRA DE DEBUG - Mostrar estado de localStorage */}
      <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm">
            <span className="font-bold text-yellow-800">🔍 DEBUG:</span>
            <span className="text-yellow-700">
              Excluidos: <strong>{excludedProducts.size}</strong>
            </span>
            <span className="text-yellow-700">
              Modificados: <strong>{Object.keys(productModifications).length}</strong>
            </span>
            <span className="text-yellow-700">
              Categorías custom: <strong>{customCategories.length}</strong>
            </span>
            <span className="text-yellow-700">
              Productos cargados: <strong>{products.length}</strong>
            </span>
          </div>
          <button
            onClick={() => {
              log.info("=== ESTADO ACTUAL DE LOCALSTORAGE ===");
              log.storage("uberEats_excludedProducts:", localStorage.getItem("uberEats_excludedProducts"));
              log.storage("uberEats_productModifications:", localStorage.getItem("uberEats_productModifications"));
              log.storage("uberEats_customCategories:", localStorage.getItem("uberEats_customCategories"));
              log.info("=== FIN DEBUG ===");
              alert("Estado guardado en consola (F12)");
            }}
            className="px-3 py-1 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600"
          >
            Ver en consola
          </button>
        </div>
      </div>
    </>
  );
}
