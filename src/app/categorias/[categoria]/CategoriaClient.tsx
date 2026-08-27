"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { useProducts } from "@/contexts/ProductContext";
import { isProductVisible } from "@/services/products";
import ProductGrid from "@/components/ProductGrid";
import { slugify } from "@/utils/string-utils";


export default function CategoriaClient() {
  const { categoria } = useParams() as { categoria: string };
  const { products, loading, error } = useProducts();

  const raw = decodeURIComponent(categoria || "");
  // La comparación era `c.toLowerCase() === target`, es decir contra el nombre
  // literal. Como el índice de categorías enlaza con el slug, cualquier
  // categoría de más de una palabra ("Bebidas Energéticas" → "bebidas-
  // energeticas") dejaba de encontrar productos. Comparando slugs, ambos
  // formatos funcionan.
  const target = slugify(raw);

  const filtered = useMemo(() => {
    return products.filter((p) =>
      p.isActive !== false &&
      isProductVisible(p) &&
      (p.categories || []).some((c) => slugify(c) === target)
    );
  }, [products, target]);

  // Se muestra el nombre real de la categoría cuando se puede recuperar de un
  // producto, en vez del slug de la URL.
  const displayName = useMemo(() => {
    for (const p of filtered) {
      const match = (p.categories || []).find((c) => slugify(c) === target);
      if (match) return match;
    }
    return raw;
  }, [filtered, target, raw]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
        <div className="size-10 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
        <span className="text-sm text-neutral-500">Cargando productos…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="o-container o-section">
        <div className="rounded-xl border border-red-200 bg-red-50 p-5">
          <h1 className="o-h3 text-red-900">No pudimos cargar los productos</h1>
          <p className="mt-1 text-sm text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="o-container o-section">
      <Link
        href="/categorias"
        className="o-focus group mb-5 inline-flex items-center gap-1.5 rounded-lg text-sm font-medium text-neutral-500 transition-colors hover:text-brand-700"
      >
        <ArrowLeftIcon className="size-4 transition-transform group-hover:-translate-x-0.5" />
        Todas las categorías
      </Link>

      <h1 className="o-h1 mb-1 text-neutral-900">{displayName}</h1>
      <p className="o-caption mb-8 text-neutral-500">
        {filtered.length} {filtered.length === 1 ? "producto" : "productos"}
      </p>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-200 px-6 py-16 text-center">
          <h2 className="o-h2 mb-2 text-neutral-900">Sin productos por ahora</h2>
          <p className="o-body mx-auto mb-7 max-w-sm text-neutral-500">
            No hay productos disponibles en esta categoría en este momento.
          </p>
          <Link
            href="/productos"
            className="o-focus inline-flex h-11 items-center rounded-xl bg-brand-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          >
            Ver catálogo completo
          </Link>
        </div>
      ) : (
        <ProductGrid products={filtered} loading={false} />
      )}
    </div>
  );
}
