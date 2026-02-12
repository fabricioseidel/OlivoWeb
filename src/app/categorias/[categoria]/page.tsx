"use client";

import React, { useMemo } from "react";
import { useParams } from "next/navigation";
import { useProducts } from "@/contexts/ProductContext";
import ProductGrid from "@/components/ProductGrid";

export default function CategoryDetailPage() {
  const { categoria } = useParams() as { categoria: string };
  const { products, loading, error } = useProducts();

  const target = decodeURIComponent(categoria || "").toLowerCase();

  const filtered = useMemo(() => {
    return products.filter((p) =>
      (p.categories || []).some((c) => c.toLowerCase() === target)
    );
  }, [products, target]);

  if (loading) return <div className="p-6">Cargando productos...</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>;
  if (!filtered.length)
    return (
      <div className="p-6">
        No hay productos en la categoría <strong>{decodeURIComponent(categoria)}</strong>.
      </div>
    );

  const gridProducts = filtered.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: p.price,
    sale_price: undefined,
    image: (p as any).image || undefined, // Using fallback images
    category: p.categories?.length ? { name: p.categories[0] } : undefined,
    featured: p.featured,
    stock: p.stock,
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Categoría: {decodeURIComponent(categoria)}</h1>
      </div>
      <ProductGrid products={gridProducts} loading={false} />
    </div>
  );
}
