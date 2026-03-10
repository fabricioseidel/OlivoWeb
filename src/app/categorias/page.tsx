"use client";

import React from "react";
import { useCategories as useCategoryHook } from "@/hooks/useCategories";
import CategoryCard from "@/components/CategoryCard";

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
    <div className="min-h-screen bg-gray-50/50">
      {/* Hero Section */}
      <div className="bg-white border-b border-gray-100 mb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <span className="inline-block px-4 py-1.5 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-[0.2em] rounded-full mb-6 border border-emerald-100">
            Nuestro Catálogo
          </span>
          <h1 className="text-5xl sm:text-6xl font-black text-gray-900 mb-6 tracking-tighter leading-none">
            Explora Nuestras <span className="text-emerald-600">Categorías</span>
          </h1>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto font-medium leading-relaxed">
            Descubre una selección cuidadosamente curada de productos premium, organizados para que encuentres exactamente lo que buscas.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-8">
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
                  productsCount: undefined
                }}
                onClick={() => router.push(`/categorias/${encodeURIComponent(slug)}`)}
              />
            );
          })}
        </div>

        {/* Info Section */}
        <div className="mt-20 p-12 bg-emerald-950 rounded-[3rem] text-center relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500 rounded-full blur-[100px] opacity-20 -mr-32 -mt-32" />
          <div className="relative z-10">
            <h2 className="text-3xl font-black text-white mb-4 tracking-tight">¿Buscas algo específico?</h2>
            <p className="text-emerald-200/70 mb-8 max-w-xl mx-auto">
              Utiliza nuestro buscador en la parte superior o navega por todas nuestras ofertas disponibles.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <button onClick={() => router.push('/productos')} className="px-8 py-4 bg-white text-emerald-950 font-black rounded-2xl hover:scale-105 transition-all">
                Ver Todos los Productos
              </button>
              <button onClick={() => router.push('/ofertas')} className="px-8 py-4 bg-emerald-800 text-white font-black rounded-2xl hover:bg-emerald-700 transition-all border border-emerald-700">
                Ver Ofertas Especiales
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
