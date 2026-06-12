"use client";

import React from "react";
import type { CategoryPopoverState, UberEatsProduct } from "../lib";

interface CategoryPopoverProps {
  categoryPopover: CategoryPopoverState | null;
  closeCategoryPopover: () => void;
  handleCategoryPopoverKeyDown: (ev: React.KeyboardEvent) => void;
  categoryPopoverPanelRef: React.RefObject<HTMLDivElement | null>;
  categoryPopoverListRef: React.RefObject<HTMLDivElement | null>;
  products: UberEatsProduct[];
  uniqueCategories: string[];
  updateProduct: (id: string, field: keyof UberEatsProduct, value: any) => void;
}

export default function CategoryPopover({
  categoryPopover,
  closeCategoryPopover,
  handleCategoryPopoverKeyDown,
  categoryPopoverPanelRef,
  categoryPopoverListRef,
  products,
  uniqueCategories,
  updateProduct,
}: CategoryPopoverProps) {
  if (!categoryPopover) return null;

  const p = products.find((x) => x.id === categoryPopover.productId);
  if (!p) return null;

  return (
    <div
      className="fixed inset-0 z-50"
      onMouseDown={() => closeCategoryPopover()}
      onTouchStart={() => closeCategoryPopover()}
    >
      <div
        ref={categoryPopoverPanelRef}
        tabIndex={-1}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onKeyDown={handleCategoryPopoverKeyDown}
        className="fixed z-50 w-80 max-w-[calc(100vw-16px)] bg-white border rounded-lg shadow-lg"
        style={{
          left: categoryPopover.left,
          top: categoryPopover.top,
          transform: categoryPopover.openUp ? 'translateY(-100%)' : undefined,
        }}
      >
        <div className="flex items-center justify-between px-3 py-2 border-b bg-gray-50 rounded-t-lg">
          <div className="text-sm font-semibold text-gray-800">Categorías</div>
          <button
            type="button"
            onClick={() => closeCategoryPopover()}
            className="px-2 py-1 text-sm border rounded hover:bg-gray-100"
            title="Cerrar"
          >
            ×
          </button>
        </div>

        <div className="px-3 py-2 text-xs text-gray-600 border-b">
          Escribe una letra para saltar a esa categoría.
        </div>

        <div ref={categoryPopoverListRef} className="max-h-60 overflow-y-auto">
          {uniqueCategories.map((cat) => (
            <label
              key={cat}
              data-cat-lower={String(cat).toLowerCase()}
              className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm"
            >
              <input
                type="checkbox"
                checked={p.uberCategories.includes(cat)}
                onChange={(e) => {
                  const newCategories = e.target.checked
                    ? [...p.uberCategories, cat]
                    : p.uberCategories.filter((c) => c !== cat);
                  updateProduct(p.id, 'uberCategories', newCategories);
                  updateProduct(p.id, 'uberCategory', newCategories[0] || '');
                }}
                className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className={p.uberCategories.includes(cat) ? 'font-medium text-emerald-700' : ''}>
                {cat}
              </span>
            </label>
          ))}

          {uniqueCategories.length === 0 && (
            <div className="px-3 py-2 text-sm text-gray-500">No hay categorías</div>
          )}
        </div>
      </div>
    </div>
  );
}
