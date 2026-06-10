"use client";

import React, { useMemo, useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import ProductGrid from "@/components/ProductGrid";
import { useProducts } from "@/contexts/ProductContext";
import { isProductVisible } from "@/services/products";
import { useCategories } from "@/hooks/useCategories";
import { Search } from "lucide-react";

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/gi, "-");

type SortKey = "name" | "price-asc" | "price-desc" | "offers";

function ProductsContent() {
  const { products, loading, error } = useProducts();
  const { categories } = useCategories();
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoriaParam = searchParams.get("categoria") || "";
  const qParam = searchParams.get("q") || "";

  const [searchText, setSearchText] = useState(qParam);
  const [sortKey, setSortKey] = useState<SortKey>("name");

  // Sincroniza con búsquedas que llegan desde el navbar o el hero
  useEffect(() => {
    setSearchText(qParam);
  }, [qParam]);

  const activeProducts = useMemo(
    () => products.filter(p => p.isActive !== false && isProductVisible(p)),
    [products]
  );

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.name.localeCompare(b.name, "es")),
    [categories]
  );

  const filteredProducts = useMemo(() => {
    const term = searchText.trim().toLowerCase();
    let list = activeProducts;
    if (categoriaParam) {
      list = list.filter(p =>
        (p.categories || []).some(c => slugify(c) === categoriaParam.toLowerCase())
      );
    }
    if (term) {
      list = list.filter(p =>
        p.name.toLowerCase().includes(term) ||
        (p.categories || []).some(c => c.toLowerCase().includes(term))
      );
    }
    const sorted = [...list];
    switch (sortKey) {
      case "price-asc":
        sorted.sort((a, b) => (a.offerPrice ?? a.price) - (b.offerPrice ?? b.price));
        break;
      case "price-desc":
        sorted.sort((a, b) => (b.offerPrice ?? b.price) - (a.offerPrice ?? a.price));
        break;
      case "offers":
        sorted.sort(
          (a, b) => (b.offerPrice ? 1 : 0) - (a.offerPrice ? 1 : 0) || a.name.localeCompare(b.name, "es")
        );
        break;
      default:
        sorted.sort((a, b) => a.name.localeCompare(b.name, "es"));
    }
    return sorted;
  }, [activeProducts, categoriaParam, searchText, sortKey]);

  const activeCategoryName = useMemo(() => {
    if (!categoriaParam) return null;
    const match = categories.find(
      c => (c.slug || slugify(c.name)) === categoriaParam.toLowerCase()
    );
    return match?.name || categoriaParam;
  }, [categories, categoriaParam]);

  const setCategory = (slug: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (slug) params.set("categoria", slug);
    else params.delete("categoria");
    router.replace(`/productos${params.toString() ? `?${params}` : ""}`, { scroll: false });
  };

  const chipClass = (active: boolean) =>
    `shrink-0 px-4 h-9 rounded-full text-xs font-bold transition-all border ${
      active
        ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
        : "bg-white text-gray-500 border-gray-200 hover:border-emerald-300 hover:text-emerald-600"
    }`;

  return (
    <div className="bg-white min-h-screen">
      <section className="bg-emerald-950 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-emerald-500/20 rounded-full blur-[100px] pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 py-7 md:py-9 relative z-10">
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight mb-1">
            {activeCategoryName || "Nuestro Catálogo"}
          </h1>
          <p className="text-emerald-100/60 text-sm font-medium">
            {loading ? "Cargando productos..." : `${filteredProducts.length} productos disponibles`}
          </p>
        </div>
      </section>

      <div className="sticky top-16 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="search"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Buscar por nombre o categoría..."
                className="w-full h-11 pl-11 pr-4 rounded-2xl bg-gray-50 border border-gray-200 text-sm text-gray-800 focus:outline-none focus:bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
              />
            </div>
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              title="Ordenar productos"
              className="h-11 px-3 rounded-2xl bg-gray-50 border border-gray-200 text-sm font-semibold text-gray-600 focus:outline-none focus:border-emerald-400 cursor-pointer"
            >
              <option value="name">Nombre A-Z</option>
              <option value="price-asc">Precio: menor a mayor</option>
              <option value="price-desc">Precio: mayor a menor</option>
              <option value="offers">Ofertas primero</option>
            </select>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 -mb-1 [scrollbar-width:thin]">
            <button onClick={() => setCategory("")} className={chipClass(!categoriaParam)}>
              Todas
            </button>
            {sortedCategories.map((cat) => {
              const slug = cat.slug || slugify(cat.name);
              return (
                <button key={cat.id} onClick={() => setCategory(slug)} className={chipClass(categoriaParam === slug)}>
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 p-4 mb-6">
            {error}
          </div>
        ) : null}

        <ProductGrid
          products={filteredProducts}
          loading={loading}
          emptyMessage={
            searchText.trim()
              ? `No encontramos productos para "${searchText.trim()}"`
              : activeCategoryName
              ? `No hay productos en ${activeCategoryName}`
              : "No hay productos"
          }
        />
      </div>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={
      <div className="bg-white min-h-screen">
        <div className="bg-emerald-950 h-28" />
        <div className="max-w-7xl mx-auto px-4 py-8">
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
