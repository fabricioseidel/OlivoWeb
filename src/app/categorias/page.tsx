"use client";

import React from "react";
import { useCategories as useCategoryHook } from "@/hooks/useCategories";
import CategoryCard from "@/components/CategoryCard";
import { useCategoryNames } from "@/hooks/useCategories"; // Assuming useCategories returns raw data, checking imports
import { useRouter } from "next/navigation";

export default function CategoriesPage() {
  const { categories, loading, error } = useCategoryHook();
  const router = useRouter();

  if (loading) return (
    <div className="max-w-7xl mx-auto px-4 py-12 flex justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-600"></div>
    </div>
  );

  if (error) return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-200">
        Error: {error}
      </div>
    </div>
  );

  if (!categories.length) return (
    <div className="max-w-7xl mx-auto px-4 py-12 text-center text-gray-500">
      No se encontraron categorías.
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Explora Nuestras Categorías</h1>
        <p className="text-gray-500">
          Encuentra todo lo que necesitas, organizado para ti.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {categories.map((category) => {
          const slug = category.slug || category.name.toLowerCase().replace(/[^a-z0-9]+/gi, "-");
          return (
            <CategoryCard
              key={category.id}
              category={{
                id: category.id,
                name: category.name,
                slug: slug,
                image: category.image,
                productsCount: undefined // API might not return this yet, optional in type
              }}
              onClick={() => router.push(`/categorias/${encodeURIComponent(slug)}`)}
            />
          );
        })}
      </div>
    </div>
  );
}
