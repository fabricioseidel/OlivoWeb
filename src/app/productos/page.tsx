"use client";

import React, { useMemo } from "react";
import ProductGrid from "@/components/ProductGrid";
import { useProducts } from "@/contexts/ProductContext";

export default function ProductsPage() {
  const { products, loading, error } = useProducts();

  // Filter only active products for the public store
  const activeProducts = useMemo(() => products.filter(p => p.isActive !== false), [products]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900">Nuestros Productos</h1>
        <p className="text-gray-500 mt-2">Explora nuestra selección de calidad garantizada.</p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 p-4 mb-6">
          {error}
        </div>
      ) : null}

      <ProductGrid products={activeProducts} loading={loading} />
    </div>
  );
}
