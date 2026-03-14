"use client";

import React from "react";
import { useCategories as useCategoryHook } from "@/hooks/useCategories";
import CategoryCard from "@/components/CategoryCard";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowRight, LayoutGrid, X } from "lucide-react";

export default function CategoriesPage() {
  const { categories, loading, error } = useCategoryHook();
  const router = useRouter();

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
      <div className="size-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
      <span className="text-gray-500 font-black uppercase tracking-widest text-[10px]">Cargando categorías...</span>
    </div>
  );

  if (error) return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="bg-red-50 text-red-600 p-8 rounded-[2.5rem] border border-red-100 flex items-center gap-6">
        <div className="size-12 bg-red-100 rounded-2xl flex items-center justify-center shrink-0">
            <X className="size-6" />
        </div>
        <div>
            <h3 className="font-black text-lg">Vaya, algo salió mal</h3>
            <p className="text-red-500/80 font-medium">Error: {error}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section Premium */}
      <section className="bg-emerald-950 pt-20 pb-20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-emerald-500/20 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-500/10 rounded-full blur-[80px] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-4 relative z-10 text-center sm:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest mb-4">
                <LayoutGrid className="size-3" />
                <span>Explora el Catálogo</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tight leading-tight">
                Todo lo que amas, <br />
                <span className="text-emerald-400">fácil de encontrar</span>
            </h1>
            <p className="text-emerald-100/60 max-w-lg mb-0 font-medium text-lg">
                Navega por nuestras categorías cuidadosamente seleccionadas. Calidad premium de Venezuela y Chile en un solo lugar.
            </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-20">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
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
                  productsCount: category.productsCount
                }}
                onClick={() => router.push(`/categorias/${encodeURIComponent(slug)}`)}
              />
            );
          })}
        </div>

        {/* Info Section / CTA Premium */}
        <div className="mt-28 p-8 sm:p-16 bg-emerald-950 rounded-[3.5rem] text-center relative overflow-hidden shadow-2xl group">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/50 to-emerald-950 opacity-100" />
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] -mr-64 -mt-64 group-hover:bg-emerald-500/20 transition-all duration-1000" />
          
          <div className="relative z-10">
            <div className="size-16 bg-white/10 backdrop-blur-xl rounded-[2rem] flex items-center justify-center mx-auto mb-8 border border-white/10 shadow-xl group-hover:scale-110 transition-transform duration-500">
                <Sparkles className="size-8 text-emerald-400" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-4 tracking-tight">¿Prefieres ver todo junto?</h2>
            <p className="text-emerald-100/60 mb-10 max-w-xl mx-auto font-medium">
              Utiliza nuestro buscador o explora el catálogo completo con las mejores ofertas disponibles hoy.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <button 
                onClick={() => router.push('/productos')} 
                className="px-8 py-5 bg-white text-emerald-950 font-black rounded-2xl hover:bg-emerald-50 transition-all flex items-center justify-center gap-2 group/btn shadow-lg shadow-emerald-900/20"
              >
                Ver Catálogo Completo
                <ArrowRight className="size-4 group-hover/btn:translate-x-1 transition-transform" />
              </button>
              <button 
                onClick={() => router.push('/ofertas')} 
                className="px-8 py-5 bg-emerald-800 text-white font-black rounded-2xl hover:bg-emerald-700 transition-all border border-emerald-700 flex items-center justify-center gap-2 group/btn"
              >
                <Sparkles className="size-4 text-emerald-400" />
                Ofertas Especiales
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
