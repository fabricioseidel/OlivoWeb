"use client";

import React, { useMemo } from "react";
import ProductGrid from "@/components/ProductGrid";
import { useProducts } from "@/contexts/ProductContext";

// Adapt products from ProductContext to the UI expected by ProductCard/ProductGrid
function mapToCardUI(products: ReturnType<typeof useProducts>["products"]) {
  return products.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: p.price,
    sale_price: undefined,
    image: (p as any).image || undefined, // Using fallback images
    category: p.categories?.length ? { name: p.categories[0] } : undefined,
    featured: p.featured,
  }));
}

export default function ProductsPage() {
  const { products, loading, error } = useProducts();

  const gridProducts = useMemo(() => mapToCardUI(products), [products]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Productos</h1>
        <p className="text-gray-500">Explora nuestra selección.</p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 p-4 mb-6">
          {error}
        </div>
      ) : null}

      <ProductGrid products={gridProducts} loading={loading} />
    </div>
  );
}
