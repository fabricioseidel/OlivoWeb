"use client";

import React, { useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import ProductGrid from "@/components/ProductGrid";
import { useProducts } from "@/contexts/ProductContext";
import { isProductVisible } from "@/services/products";
import { useCategories } from "@/hooks/useCategories";

import { Sparkles } from "lucide-react";

function ProductsContent() {
  const { products, loading, error } = useProducts();
  const { categories } = useCategories();
  const searchParams = useSearchParams();
  const categoriaParam = searchParams.get("categoria");

  const activeProducts = useMemo(
    () => products.filter(p => p.isActive !== false && isProductVisible(p)),
    [products]
  );

  const filteredProducts = useMemo(() => {
    if (!categoriaParam) return activeProducts;
    return activeProducts.filter(p =>
      (p.categories || []).some(
        c => c.toLowerCase().replace(/[^a-z0-9]+/gi, "-") === categoriaParam.toLowerCase()
      )
    );
  }, [activeProducts, categoriaParam]);

  const activeCategoryName = useMemo(() => {
    if (!categoriaParam) return null;
    const match = categories.find(
      c => (c.slug || c.name.toLowerCase().replace(/[^a-z0-9]+/gi, "-")) === categoriaParam.toLowerCase()
    );
    return match?.name || categoriaParam;
  }, [categories, categoriaParam]);

  return (
    <div className="bg-white min-h-screen">
      <section className="bg-emerald-950 pt-16 pb-16 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-emerald-500/20 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-500/10 rounded-full blur-[80px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 relative z-10 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest mb-4">
            <Sparkles className="size-3" />
            <span>{activeCategoryName || "Nuestro Catálogo"}</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight leading-tight">
            {activeCategoryName ? (
              <>
                {activeCategoryName}<br />
                <span className="text-emerald-400">en OlivoMarket</span>
              </>
            ) : (
              <>
                Calidad en cada <br />
                <span className="text-emerald-400">rincón de tu hogar</span>
              </>
            )}
          </h1>
          <p className="text-emerald-100/60 max-w-lg mb-0 font-medium">
            {activeCategoryName
              ? `Todos los productos de la categoría ${activeCategoryName}`
              : "Explora nuestra selección completa de productos venezolanos y chilenos. Lo mejor para tu mesa y tu familia."}
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-12">
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 p-4 mb-6">
            {error}
          </div>
        ) : null}

        <ProductGrid
          products={filteredProducts}
          loading={loading}
          emptyMessage={activeCategoryName ? `No hay productos en ${activeCategoryName}` : "No hay productos"}
        />
      </div>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={
      <div className="bg-white min-h-screen">
        <div className="bg-emerald-950 pt-16 pb-16 h-48" />
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-72 bg-gray-100 animate-pulse rounded-[2rem]" />
            ))}
          </div>
        </div>
      </div>
    }>
      <ProductsContent />
    </Suspense>
  );
}
