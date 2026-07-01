"use client";

import { type ProductChanges } from "../lib";
import ProductCard from "./ProductCard";

interface ProductCardsGridProps {
  viewMode: "table" | "cards";
  visibleProducts: any[];
  editedChanges: Record<string, ProductChanges>;
  onChange: (productId: string, field: keyof ProductChanges, value: string | string[]) => void;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
}

export default function ProductCardsGrid({
  viewMode,
  visibleProducts,
  editedChanges,
  onChange,
  selectedIds,
  onToggleSelect,
}: ProductCardsGridProps) {
  return (
    <div
      className={
        viewMode === "table"
          ? "lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-4"
          : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4"
      }
    >
      {visibleProducts.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          changes={editedChanges[product.id]}
          onChange={onChange}
          selected={selectedIds.has(product.id)}
          onToggleSelect={onToggleSelect}
        />
      ))}
    </div>
  );
}
