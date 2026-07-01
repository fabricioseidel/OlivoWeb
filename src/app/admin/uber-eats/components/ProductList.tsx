"use client";

import React from "react";
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PencilIcon,
} from "@heroicons/react/24/outline";
import {
  EXPORT_SELECTED_KEY,
  ITEMS_PER_PAGE,
  type UberEatsProduct,
} from "../lib";

interface ProductListProps {
  filteredProducts: UberEatsProduct[];
  currentPage: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  setProducts: React.Dispatch<React.SetStateAction<UberEatsProduct[]>>;
  toggleExportSelected: (id: string) => void;
  toggleEditSelected: (id: string) => void;
  exportedProducts: Set<string>;
  setSelectedProductForUpload: React.Dispatch<React.SetStateAction<string | null>>;
}

export default function ProductList({
  filteredProducts,
  currentPage,
  setCurrentPage,
  setProducts,
  toggleExportSelected,
  toggleEditSelected,
  exportedProducts,
  setSelectedProductForUpload,
}: ProductListProps) {
  return (
    <>
      {/* Vista Móvil (Cards) */}
      <div className="md:hidden space-y-4">
        {filteredProducts
          .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
          .map((product) => (
            <div
              key={product.id}
              className={`bg-white rounded-lg shadow p-4 space-y-3 relative border-l-4 ${product.exportSelected ? "border-emerald-500" : "border-gray-200"} ${!product.isValid ? "bg-red-50 border-red-500" : ""}`}
              onClick={() => setSelectedProductForUpload(product.id)}
            >
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {product.isValid ? (
                      <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0" />
                    ) : (
                      <ExclamationTriangleIcon className="w-5 h-5 text-red-500 flex-shrink-0" />
                    )}
                    <span className="text-sm font-bold text-gray-900 truncate">{product.name}</span>
                  </div>
                  <div className="text-xs text-gray-500 font-mono">{product.barcode}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-base font-black text-emerald-600">${product.priceWithVat.toLocaleString()}</div>
                  <div className="text-[10px] text-gray-400 uppercase font-bold">IVA {product.vatPercentage}%</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {product.uberCategories.length > 0 ? (
                  product.uberCategories.slice(0, 2).map((cat, i) => (
                    <span key={i} className="px-2 py-0.5 bg-gray-100 text-[10px] font-bold text-gray-600 rounded-full truncate max-w-[120px]">
                      {cat}
                    </span>
                  ))
                ) : (
                  <span className="px-2 py-0.5 bg-gray-50 text-[10px] font-bold text-gray-400 rounded-full italic">Sin categoría</span>
                )}
                {product.uberCategories.length > 2 && (
                  <span className="px-2 py-0.5 bg-emerald-50 text-[10px] font-bold text-emerald-700 rounded-full">+{product.uberCategories.length - 2} más</span>
                )}
              </div>

              {!product.isValid && (
                <div className="text-[10px] text-red-600 bg-red-100/50 p-2 rounded border border-red-100 mt-2">
                  {product.validationErrors.map((e, i) => (
                    <div key={i} className="flex gap-1"><span>•</span> {e}</div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-gray-100 mt-2">
                <div className="flex gap-3">
                  <label className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={product.exportSelected}
                      onChange={() => toggleExportSelected(product.id)}
                      className="w-4 h-4 rounded text-emerald-600"
                    />
                    <span className="text-xs font-bold text-gray-600">Export</span>
                  </label>
                  <label className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={product.editSelected}
                      onChange={() => toggleEditSelected(product.id)}
                      className="w-4 h-4 rounded text-blue-600"
                    />
                    <span className="text-xs font-bold text-gray-600">Sel.</span>
                  </label>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setSelectedProductForUpload(product.id); }}
                  className="px-3 py-1 bg-emerald-600 text-white rounded text-xs font-bold hover:bg-emerald-700"
                >
                  EDITAR
                </button>
              </div>
            </div>
          ))
        }
      </div>

      {/* Tabla de productos - COMPACTA (Vista Desktop) */}
      <div className="hidden md:block bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase w-12">
                  <input
                    type="checkbox"
                    checked={filteredProducts.length > 0 && filteredProducts.every((p) => p.exportSelected)}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      const filteredIds = new Set(filteredProducts.map((p) => p.id));
                      setProducts((prev) => {
                        const next = prev.map((p) => (filteredIds.has(p.id) ? { ...p, exportSelected: checked } : p));
                        localStorage.setItem(EXPORT_SELECTED_KEY, JSON.stringify(next.filter(x => x.exportSelected).map(x => x.id)));
                        return next;
                      });
                    }}
                    className="rounded text-emerald-600"
                    title="Exportar todos"
                  />
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase w-12">
                  <input
                    type="checkbox"
                    checked={filteredProducts.length > 0 && filteredProducts.every((p) => p.editSelected)}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      const filteredIds = new Set(filteredProducts.map((p) => p.id));
                      setProducts((prev) => prev.map((p) => (filteredIds.has(p.id) ? { ...p, editSelected: checked } : p)));
                    }}
                    className="rounded text-blue-600"
                    title="Seleccionar todos"
                  />
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase w-16">Estado</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoría</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase w-32">Precio</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase w-28">Acción</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProducts
                .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                .map((product) => (
                  <tr
                    key={product.id}
                    className={`hover:bg-gray-50 transition cursor-pointer ${product.exportSelected ? "bg-emerald-50" : ""} ${!product.isValid ? "bg-red-50" : ""
                      }`}
                    onClick={() => setSelectedProductForUpload(product.id)}
                  >
                    <td className="px-3 py-4" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={product.exportSelected}
                        onChange={() => toggleExportSelected(product.id)}
                        className="rounded text-emerald-600"
                      />
                    </td>
                    <td className="px-3 py-4" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={product.editSelected}
                        onChange={() => toggleEditSelected(product.id)}
                        className="rounded text-blue-600"
                      />
                    </td>
                    <td className="px-3 py-4">
                      {product.isValid ? (
                        <div className="flex items-center gap-1">
                          <CheckCircleIcon className="w-5 h-5 text-green-500" title="Válido" />
                          {exportedProducts.has(product.id) && (
                            <span className="text-[10px] px-1 py-0.5 rounded bg-blue-100 text-blue-700">EXP</span>
                          )}
                        </div>
                      ) : (
                        <div className="relative group">
                          <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
                          <div className="absolute z-10 hidden group-hover:block w-64 p-2 bg-red-100 text-red-800 text-xs rounded shadow-lg left-6 top-0">
                            {product.validationErrors.map((e, i) => (
                              <div key={i}>• {e}</div>
                            ))}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-4">
                      <div className="max-w-md">
                        <div className="font-medium text-gray-900 truncate">{product.name}</div>
                        <div className="text-xs text-gray-500 font-mono truncate">{product.barcode}</div>
                      </div>
                    </td>
                    <td className="px-3 py-4">
                      <div className="text-sm text-gray-900">
                        {product.uberCategories.length > 0 ? (
                          product.uberCategories.length === 1 ? (
                            <span className="px-2 py-1 bg-gray-100 rounded-md text-xs">{product.uberCategories[0]}</span>
                          ) : (
                            <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-md text-xs font-medium">
                              {product.uberCategories.length} categorías
                            </span>
                          )
                        ) : (
                          <span className="text-gray-400 text-xs italic">Sin categoría</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-4">
                      <div className="font-semibold text-gray-900">${product.priceWithVat.toLocaleString()}</div>
                      <div className="text-xs text-gray-500">IVA {product.vatPercentage}%</div>
                    </td>
                    <td className="px-3 py-4" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setSelectedProductForUpload(product.id)}
                        className="px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition flex items-center gap-1.5 whitespace-nowrap"
                      >
                        <PencilIcon className="w-4 h-4" />
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {filteredProducts.length > ITEMS_PER_PAGE && (
          <div className="px-4 py-3 bg-gray-50 border-t flex flex-wrap items-center justify-between gap-4">
            <div className="text-sm text-gray-600">
              Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredProducts.length)} de {filteredProducts.length}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="px-3 py-1 text-sm border rounded hover:bg-gray-100 disabled:opacity-50">⏮️</button>
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 text-sm border rounded hover:bg-gray-100 disabled:opacity-50">◀️</button>
              <span className="px-3 py-1 text-sm font-semibold bg-emerald-100 text-emerald-800 rounded">Pág. {currentPage}/{Math.ceil(filteredProducts.length / ITEMS_PER_PAGE)}</span>
              <button onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredProducts.length / ITEMS_PER_PAGE), p + 1))} disabled={currentPage >= Math.ceil(filteredProducts.length / ITEMS_PER_PAGE)} className="px-3 py-1 text-sm border rounded hover:bg-gray-100 disabled:opacity-50">▶️</button>
              <button onClick={() => setCurrentPage(Math.ceil(filteredProducts.length / ITEMS_PER_PAGE))} disabled={currentPage >= Math.ceil(filteredProducts.length / ITEMS_PER_PAGE)} className="px-3 py-1 text-sm border rounded hover:bg-gray-100 disabled:opacity-50">⏭️</button>
            </div>
          </div>
        )}

        {filteredProducts.length === 0 && (
          <div className="px-4 py-12 text-center text-gray-500">
            No se encontraron productos
          </div>
        )}
      </div>
    </>
  );
}
