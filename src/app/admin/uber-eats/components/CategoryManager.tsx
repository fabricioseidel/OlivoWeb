"use client";

import React from "react";
import { ChevronDownIcon, PencilIcon, PlusIcon } from "@heroicons/react/24/outline";
import type { UberEatsProduct } from "../lib";

interface CategoryManagerProps {
  showCategoryManager: boolean;
  setShowCategoryManager: React.Dispatch<React.SetStateAction<boolean>>;
  uniqueCategories: string[];
  newCategoryName: string;
  setNewCategoryName: React.Dispatch<React.SetStateAction<string>>;
  addCategory: () => void;
  editingCategory: string | null;
  setEditingCategory: React.Dispatch<React.SetStateAction<string | null>>;
  editCategoryValue: string;
  setEditCategoryValue: React.Dispatch<React.SetStateAction<string>>;
  renameCategory: (oldName: string, newName: string) => void;
  products: UberEatsProduct[];
}

export default function CategoryManager({
  showCategoryManager,
  setShowCategoryManager,
  uniqueCategories,
  newCategoryName,
  setNewCategoryName,
  addCategory,
  editingCategory,
  setEditingCategory,
  editCategoryValue,
  setEditCategoryValue,
  renameCategory,
  products,
}: CategoryManagerProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-visible">
      <button
        onClick={() => setShowCategoryManager(!showCategoryManager)}
        className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold text-gray-900">📂 Gestionar Categorías</span>
          <span className="text-sm text-gray-500">({uniqueCategories.length} categorías)</span>
        </div>
        <ChevronDownIcon className={`w-5 h-5 text-gray-500 transition-transform ${showCategoryManager ? "rotate-180" : ""}`} />
      </button>

      {showCategoryManager && (
        <div className="p-4 space-y-4">
          <p className="text-sm text-gray-600">
            Estas son tus categorías actuales. Puedes agregar nuevas o editar las existentes.
            Los cambios se aplicarán a todos los productos de esa categoría.
          </p>

          {/* Agregar nueva categoría */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Nueva categoría..."
              className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
              onKeyDown={(e) => e.key === "Enter" && addCategory()}
            />
            <button
              onClick={addCategory}
              disabled={!newCategoryName.trim()}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1"
            >
              <PlusIcon className="w-4 h-4" />
              Agregar
            </button>
          </div>

          {/* Lista de categorías */}
          <div className="grid gap-2 max-h-[300px] overflow-y-auto">
            {uniqueCategories.map((cat) => (
              <div key={cat} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg group">
                {editingCategory === cat ? (
                  <>
                    <input
                      type="text"
                      value={editCategoryValue}
                      onChange={(e) => setEditCategoryValue(e.target.value)}
                      className="flex-1 px-2 py-1 border rounded focus:ring-2 focus:ring-emerald-500"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") renameCategory(cat, editCategoryValue);
                        if (e.key === "Escape") setEditingCategory(null);
                      }}
                    />
                    <button
                      onClick={() => renameCategory(cat, editCategoryValue)}
                      className="px-2 py-1 bg-emerald-600 text-white text-sm rounded"
                    >
                      Guardar
                    </button>
                    <button
                      onClick={() => setEditingCategory(null)}
                      className="px-2 py-1 border text-sm rounded"
                    >
                      Cancelar
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{cat}</div>
                      <div className="text-xs text-gray-500">
                        {products.filter(p => p.uberCategory === cat).length} productos
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setEditingCategory(cat);
                        setEditCategoryValue(cat);
                      }}
                      className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded opacity-0 group-hover:opacity-100 transition"
                      title="Editar categoría"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
