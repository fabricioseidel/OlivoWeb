"use client";

import React, { useMemo } from "react";
import ProductGrid from "@/components/ProductGrid";
import { useProducts } from "@/contexts/ProductContext";

// Adapt products from ProductContext to the UI expected by ProductCard/ProductGrid
function mapToCardUI(products: ReturnType<typeof useProducts>["products"]) {
  return products.map((p) => {
    // Logic to adapt the price model:
    // Context returns: price (final) and priceOriginal (previous, if offer exists)
    // ProductCard expects: price (base) and sale_price (offer, if exists)

    const hasOffer = p.priceOriginal && p.priceOriginal > p.price;

    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      // If there is an offer, the Card expects 'price' to be the high one (original)
      // and 'sale_price' to be the low one (current).
      // If no offer, 'price' is just the current price.
      price: hasOffer ? p.priceOriginal! : p.price,
      sale_price: hasOffer ? p.price : undefined,
      image: (p as any).image || undefined, // Using fallback images
      category: p.categories?.length ? { name: p.categories[0] } : undefined,
      featured: p.featured,
      stock: p.stock,
    };
  });
}

export default function ProductsPage() {
  const { products, loading, error } = useProducts();

  // Filter only active products for the public store
  const activeProducts = useMemo(() => products.filter(p => p.isActive !== false), [products]);

  const gridProducts = useMemo(() => mapToCardUI(activeProducts), [activeProducts]);

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

      <ProductGrid products={gridProducts} loading={loading} />
    </div>
  );
}
