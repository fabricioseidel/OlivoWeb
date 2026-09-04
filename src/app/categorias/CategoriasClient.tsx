"use client";

import React from "react";
import Link from "next/link";
import { useCategories as useCategoryHook } from "@/hooks/useCategories";
import CategoryCard from "@/components/CategoryCard";
import { LayoutGrid, X } from "lucide-react";

export default function CategoriasClient() {
  const { categories, loading, error } = useCategoryHook();

  if (loading) return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-white p-4">
      <div className="size-10 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      <span className="text-sm text-neutral-500">Cargando categorías…</span>
    </div>
  );

  if (error) return (
    <div className="o-container o-section">
      <div className="flex items-start gap-4 rounded-xl border border-red-200 bg-red-50 p-5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600">
          <X className="size-5" />
        </span>
        <div>
          <h1 className="o-h3 text-red-900">No pudimos cargar las categorías</h1>
          <p className="mt-1 text-sm text-red-700">{error}</p>
        </div>
      </div>
    </div>
  );

  // Mismo criterio que la portada: el número que se anuncia es el de productos
  // realmente visibles, y las categorías vacías no ocupan un espacio muerto.
  const visibles = (c: typeof categories[number]) => c.visibleProductsCount ?? c.productsCount ?? 0;
  const sorted = [...categories]
    .filter((c) => visibles(c) > 0)
    .sort((a, b) => a.name.localeCompare(b.name, "es"));

  return (
    <div className="min-h-screen bg-white">
      <section className="border-b border-neutral-100 bg-neutral-50">
        <div className="o-container py-10 md:py-14">
          <h1 className="o-display mb-2 text-neutral-900">Categorías</h1>
          <p className="o-body max-w-lg text-neutral-600">
            Explora nuestro catálogo por tipo de producto.
          </p>
        </div>
      </section>

      <div className="o-container o-section">
        {/* Antes, si la lista venía vacía, la página quedaba con una grilla en
            blanco y ningún mensaje. */}
        {sorted.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-200 px-6 py-16 text-center">
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-neutral-100">
              <LayoutGrid className="size-7 text-neutral-400" />
            </div>
            <h2 className="o-h2 mb-2 text-neutral-900">Aún no hay categorías</h2>
            <p className="o-body mx-auto mb-7 max-w-sm text-neutral-500">
              Estamos organizando el catálogo. Mientras tanto puedes ver todos los productos.
            </p>
            <Link
              href="/productos"
              className="o-focus inline-flex h-11 items-center rounded-xl bg-brand-boton px-6 text-sm font-semibold text-brand-contraste transition-colors hover:bg-brand-700"
            >
              Ver todos los productos
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 sm:gap-3 lg:grid-cols-6">
              {sorted.map((category) => {
                const slug = category.slug || category.name.toLowerCase().replace(/[^a-z0-9]+/gi, "-");
                return (
                  <CategoryCard
                    key={category.id}
                    href={`/categorias/${encodeURIComponent(slug)}`}
                    category={{
                      id: category.id,
                      name: category.name,
                      slug,
                      image: category.image,
                      productsCount: visibles(category)
                    }}
                  />
                );
              })}
            </div>

            <div className="mt-10 flex flex-wrap justify-center gap-3 border-t border-neutral-100 pt-10">
              <Link
                href="/productos"
                className="o-focus inline-flex h-11 items-center rounded-xl bg-brand-boton px-6 text-sm font-semibold text-brand-contraste transition-colors hover:bg-brand-700"
              >
                Ver catálogo completo
              </Link>
              <Link
                href="/ofertas"
                className="o-focus inline-flex h-11 items-center rounded-xl border border-neutral-200 px-6 text-sm font-semibold text-neutral-700 transition-colors hover:border-brand-400 hover:text-brand-700"
              >
                Ver ofertas
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
