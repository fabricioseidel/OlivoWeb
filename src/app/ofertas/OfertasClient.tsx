"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { Search, ChevronDown, Tag } from "lucide-react";
import { useProducts } from "@/contexts/ProductContext";
import { isProductVisible } from "@/services/products";
import { useCategoryNames } from "@/hooks/useCategories";
import ProductCard from "@/components/ProductCard";

export default function OfertasClient() {
  const { products, loading: productsLoading } = useProducts();
  const { categoryNames, loading: categoriesLoading } = useCategoryNames();
  const [category, setCategory] = useState("Todas");
  const [search, setSearch] = useState("");

  // Criterio de oferta: tiene offerPrice < price e isActive
  const offerProducts = useMemo(() =>
    products.filter(p => p.isActive && isProductVisible(p) && !!(p.offerPrice && p.offerPrice > 0 && p.offerPrice < p.price)),
    [products]);

  const categories = useMemo(() => ["Todas", ...categoryNames], [categoryNames]);

  const loading = productsLoading || categoriesLoading;

  const filtered = offerProducts.filter(p => {
    const catOk = category === "Todas" || (Array.isArray(p.categories) && p.categories.some(c => c.toLowerCase() === category.toLowerCase()));
    const searchOk = p.name.toLowerCase().includes(search.toLowerCase()) ||
                    (p.description?.toLowerCase().includes(search.toLowerCase()) ?? false);
    return catOk && searchOk;
  });

  const hasFilters = search.trim() !== "" || category !== "Todas";

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-white p-4">
        <div className="size-10 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
        <span className="text-sm text-neutral-500">Cargando ofertas…</span>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white p-4">
        <div className="o-card max-w-md px-6 py-12 text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-neutral-100">
            <Tag className="size-7 text-neutral-400" />
          </div>
          <h1 className="o-h2 mb-2 text-neutral-900">Catálogo en actualización</h1>
          <p className="o-body mb-7 text-neutral-500">
            Estamos actualizando los productos. Vuelve en unos minutos.
          </p>
          <Link
            href="/productos"
            className="o-focus inline-flex h-12 items-center rounded-xl bg-brand-boton px-7 font-semibold text-brand-contraste transition-colors hover:bg-brand-700"
          >
            Ir al catálogo
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <section className="border-b border-neutral-100 bg-neutral-50">
        <div className="o-container py-10 md:py-14">
          <h1 className="o-display mb-2 text-neutral-900">Ofertas</h1>
          <p className="o-body mb-7 max-w-lg text-neutral-600">
            Productos con precio rebajado por tiempo limitado.
          </p>

          <div className="flex max-w-2xl flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <label htmlFor="buscar-ofertas" className="sr-only">Buscar en ofertas</label>
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
              <input
                id="buscar-ofertas"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar en ofertas…"
                className="h-11 w-full rounded-xl border border-neutral-200 bg-white pl-10 pr-4 text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-brand-500"
              />
            </div>
            <div className="relative sm:w-56">
              <label htmlFor="categoria-ofertas" className="sr-only">Filtrar por categoría</label>
              {/* El select usaba appearance-none sin flecha propia, así que no
                  había ninguna señal visual de que fuera desplegable. */}
              <select
                id="categoria-ofertas"
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="h-11 w-full cursor-pointer appearance-none rounded-xl border border-neutral-200 bg-white pl-4 pr-10 text-sm text-neutral-900 outline-none transition-colors focus:border-brand-500"
              >
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
            </div>
          </div>
        </div>
      </section>

      <section className="o-container o-section">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-200 px-6 py-16 text-center">
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-neutral-100">
              {hasFilters ? (
                <Search className="size-7 text-neutral-400" />
              ) : (
                <Tag className="size-7 text-neutral-400" />
              )}
            </div>
            {/* Antes este bloque siempre decía "ofertas para ''" aunque no
                hubiera búsqueda, y no distinguía "no hay ofertas" de "tu
                filtro no encontró nada". */}
            <h2 className="o-h2 mb-2 text-neutral-900">
              {hasFilters ? "Sin resultados" : "No hay ofertas activas"}
            </h2>
            <p className="o-body mx-auto mb-7 max-w-sm text-neutral-500">
              {hasFilters
                ? search.trim()
                  ? `No encontramos ofertas que coincidan con "${search.trim()}".`
                  : "No hay ofertas en esta categoría."
                : "Por ahora no tenemos productos con descuento. Revisa el catálogo completo."}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {hasFilters && (
                <button
                  onClick={() => { setSearch(""); setCategory("Todas"); }}
                  className="o-focus h-11 rounded-xl border border-neutral-200 px-5 text-sm font-semibold text-neutral-700 transition-colors hover:border-neutral-300"
                >
                  Limpiar filtros
                </button>
              )}
              <Link
                href="/productos"
                className="o-focus inline-flex h-11 items-center rounded-xl bg-brand-boton px-6 text-sm font-semibold text-brand-contraste transition-colors hover:bg-brand-700"
              >
                Ver catálogo completo
              </Link>
            </div>
          </div>
        ) : (
          <>
            <p className="mb-5 text-sm text-neutral-500">
              {filtered.length} {filtered.length === 1 ? "oferta" : "ofertas"}
              {category !== "Todas" && ` en ${category}`}
            </p>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-5">
              {filtered.map(product => (
                <ProductCard
                  key={product.id}
                  product={{
                    id: product.id,
                    name: product.name,
                    slug: product.slug || product.id,
                    price: product.price,
                    offerPrice: product.offerPrice,
                    image: product.image,
                    categories: product.categories || [],
                    description: product.description || "",
                    featured: product.featured,
                    stock: product.stock
                  }}
                />
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
