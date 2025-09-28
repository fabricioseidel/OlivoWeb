"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { useCategories as useCategoryHook } from "@/hooks/useCategories";
import { normalizeImageUrl } from "@/utils/image";

export default function CategoriesPage() {
  const { categories, loading, error } = useCategoryHook();

  if (loading) return <div className="p-6">Cargando categorías…</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>;
  if (!categories.length) return <div className="p-6">No se encontraron categorías.</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <h1 className="text-2xl font-bold mb-6">Categorías</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {categories.map((category) => {
          const slug = category.slug || category.name.toLowerCase().replace(/[^a-z0-9]+/gi, "-");
          const img = normalizeImageUrl(category.image);
          return (
            <Link
              key={category.id}
              href={`/categorias/${encodeURIComponent(slug)}`}
              className="group overflow-hidden rounded-lg shadow-md transition-all hover:shadow-lg"
            >
              <div className="img-container wide">
                <div className="absolute inset-0 bg-emerald-900/30 group-hover:bg-emerald-900/20 transition-all z-10"></div>
                <Image
                  src={img}
                  alt={category.name}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  className="w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-500"
                />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
