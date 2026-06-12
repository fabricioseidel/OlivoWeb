"use client";

import React from "react";
import { MagnifyingGlassIcon, TrashIcon } from "@heroicons/react/24/outline";
import {
  HFSS_OPTIONS,
  PRODUCT_TYPES,
  log,
  type UberEatsProduct,
  type UberEatsStats,
} from "../lib";

interface FiltersToolbarProps {
  searchTerm: string;
  setSearchTerm: React.Dispatch<React.SetStateAction<string>>;
  filterCategory: string;
  setFilterCategory: React.Dispatch<React.SetStateAction<string>>;
  filterValid: "all" | "valid" | "invalid";
  setFilterValid: React.Dispatch<React.SetStateAction<"all" | "valid" | "invalid">>;
  showOnlySelected: boolean;
  setShowOnlySelected: React.Dispatch<React.SetStateAction<boolean>>;
  uniqueCategories: string[];
  filteredProducts: UberEatsProduct[];
  stats: UberEatsStats;
  selectAllExportFiltered: () => void;
  deselectAllExport: () => void;
  selectAllEditFiltered: () => void;
  deselectAllEdit: () => void;
  removeSelected: () => void;
  bulkAction: string;
  setBulkAction: React.Dispatch<React.SetStateAction<string>>;
  bulkValue: string;
  setBulkValue: React.Dispatch<React.SetStateAction<string>>;
  applyBulkAction: () => void;
  addMeasurementUnits: () => void;
  applyNamePattern: (pattern: string, replacement: string) => void;
  products: UberEatsProduct[];
  setProducts: React.Dispatch<React.SetStateAction<UberEatsProduct[]>>;
  setProductModifications: React.Dispatch<React.SetStateAction<Record<string, Partial<UberEatsProduct>>>>;
}

export default function FiltersToolbar({
  searchTerm,
  setSearchTerm,
  filterCategory,
  setFilterCategory,
  filterValid,
  setFilterValid,
  showOnlySelected,
  setShowOnlySelected,
  uniqueCategories,
  filteredProducts,
  stats,
  selectAllExportFiltered,
  deselectAllExport,
  selectAllEditFiltered,
  deselectAllEdit,
  removeSelected,
  bulkAction,
  setBulkAction,
  bulkValue,
  setBulkValue,
  applyBulkAction,
  addMeasurementUnits,
  applyNamePattern,
  products,
  setProducts,
  setProductModifications,
}: FiltersToolbarProps) {
  return (
    <div className="bg-white rounded-lg p-4 shadow-sm border space-y-4">
      <div className="flex flex-wrap gap-4">
        {/* Búsqueda */}
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, código o categoría..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Filtro categoría original */}
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">Todas las categorías</option>
          {uniqueCategories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        {/* Filtro validez */}
        <select
          value={filterValid}
          onChange={(e) => setFilterValid(e.target.value as any)}
          className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
        >
          <option value="all">Todos</option>
          <option value="valid">✅ Solo válidos</option>
          <option value="invalid">❌ Solo con errores</option>
        </select>

        {/* Solo seleccionados */}
        <label className="flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer hover:bg-gray-50">
          <input
            type="checkbox"
            checked={showOnlySelected}
            onChange={(e) => setShowOnlySelected(e.target.checked)}
            className="rounded text-emerald-600"
          />
          <span className="text-sm">Solo para exportar</span>
        </label>
      </div>

      {/* Acciones masivas */}
      <div className="flex flex-wrap items-center gap-4 pt-4 border-t">
        <span className="text-sm font-medium text-gray-700">Acciones masivas:</span>

        <button
          onClick={selectAllExportFiltered}
          className="px-3 py-1.5 text-sm bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition"
        >
          Marcar export ({filteredProducts.length})
        </button>

        <button
          onClick={deselectAllExport}
          className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
        >
          Quitar export
        </button>

        <button
          onClick={selectAllEditFiltered}
          className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition"
        >
          Seleccionar editar ({filteredProducts.length})
        </button>

        <button
          onClick={deselectAllEdit}
          className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
        >
          Quitar editar
        </button>

        <button
          onClick={removeSelected}
          disabled={stats.editSelected === 0}
          className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition disabled:opacity-50"
        >
          <TrashIcon className="w-4 h-4 inline mr-1" />
          Excluir del editor ({stats.editSelected})
        </button>

        <div className="flex items-center gap-2 ml-auto">
          <select
            value={bulkAction}
            onChange={(e) => {
              setBulkAction(e.target.value);
              setBulkValue("");
            }}
            className="px-3 py-1.5 text-sm border rounded-lg"
          >
            <option value="">Cambio masivo...</option>
            <option value="category">Categoría Uber</option>
            <option value="productType">Tipo de producto</option>
            <option value="hfss">HFSS</option>
            <option value="vat">% IVA</option>
          </select>

          {bulkAction === "category" && (
            <select
              value={bulkValue}
              onChange={(e) => setBulkValue(e.target.value)}
              className="px-3 py-1.5 text-sm border rounded-lg"
            >
              <option value="">Seleccionar categoría...</option>
              {uniqueCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          )}

          {bulkAction === "productType" && (
            <select
              value={bulkValue}
              onChange={(e) => setBulkValue(e.target.value)}
              className="px-3 py-1.5 text-sm border rounded-lg"
            >
              {PRODUCT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          )}

          {bulkAction === "hfss" && (
            <select
              value={bulkValue}
              onChange={(e) => setBulkValue(e.target.value)}
              className="px-3 py-1.5 text-sm border rounded-lg"
            >
              {HFSS_OPTIONS.map((h) => (
                <option key={h.value} value={h.value}>
                  {h.label}
                </option>
              ))}
            </select>
          )}

          {bulkAction === "vat" && (
            <input
              type="number"
              step="1"
              placeholder="19"
              value={bulkValue}
              onChange={(e) => setBulkValue(e.target.value)}
              className="px-3 py-1.5 text-sm border rounded-lg w-24"
            />
          )}

          {bulkAction && bulkValue && (
            <button
              onClick={applyBulkAction}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Aplicar
            </button>
          )}
        </div>
      </div>

      {/* NUEVA SECCIÓN: Herramientas de edición masiva de nombres */}
      <div className="flex flex-wrap items-center gap-4 pt-4 border-t">
        <span className="text-sm font-medium text-gray-700">🔧 Edición masiva de nombres:</span>

        <button
          onClick={addMeasurementUnits}
          className="px-3 py-1.5 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition"
          title="Normaliza unidades: ml→ML, lt→LT, g→G, kg→KG"
        >
          📏 Normalizar unidades
        </button>

        <button
          onClick={() => {
            const pattern = prompt("Buscar (regex o texto):", "");
            if (!pattern) return;
            const replacement = prompt("Reemplazar con:", "");
            if (replacement === null) return;
            applyNamePattern(pattern, replacement);
          }}
          className="px-3 py-1.5 text-sm bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition"
          title="Buscar y reemplazar texto en nombres de productos seleccionados"
        >
          🔍 Buscar/Reemplazar
        </button>

        <button
          onClick={() => {
            const suffix = prompt("Agregar al final de cada nombre (ej: ' LT'):", "");
            if (!suffix) return;
            const selectedProducts = products.filter(p => p.editSelected);
            if (selectedProducts.length === 0) {
              alert("Selecciona productos primero");
              return;
            }
            setProductModifications(prev => {
              const updated = { ...prev };
              selectedProducts.forEach(p => {
                if (!updated[p.id]) updated[p.id] = {};
                updated[p.id].name = p.name.trim() + suffix;
              });
              return updated;
            });
            setProducts(prev => prev.map(p => {
              if (!p.editSelected) return p;
              return { ...p, name: p.name.trim() + suffix };
            }));
            log.success("Sufijo agregado a", selectedProducts.length, "productos");
            alert(`Sufijo "${suffix}" agregado a ${selectedProducts.length} productos`);
          }}
          disabled={stats.editSelected === 0}
          className="px-3 py-1.5 text-sm bg-teal-100 text-teal-700 rounded-lg hover:bg-teal-200 transition disabled:opacity-50"
        >
          ➕ Agregar sufijo ({stats.editSelected})
        </button>

        <button
          onClick={() => {
            const prefix = prompt("Agregar al inicio de cada nombre (ej: 'NUEVO '):", "");
            if (!prefix) return;
            const selectedProducts = products.filter(p => p.editSelected);
            if (selectedProducts.length === 0) {
              alert("Selecciona productos primero");
              return;
            }
            setProductModifications(prev => {
              const updated = { ...prev };
              selectedProducts.forEach(p => {
                if (!updated[p.id]) updated[p.id] = {};
                updated[p.id].name = prefix + p.name.trim();
              });
              return updated;
            });
            setProducts(prev => prev.map(p => {
              if (!p.editSelected) return p;
              return { ...p, name: prefix + p.name.trim() };
            }));
            log.success("Prefijo agregado a", selectedProducts.length, "productos");
            alert(`Prefijo "${prefix}" agregado a ${selectedProducts.length} productos`);
          }}
          disabled={stats.editSelected === 0}
          className="px-3 py-1.5 text-sm bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition disabled:opacity-50"
        >
          ⬅️ Agregar prefijo ({stats.editSelected})
        </button>
      </div>
    </div>
  );
}
