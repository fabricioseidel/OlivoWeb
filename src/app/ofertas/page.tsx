"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Sparkles } from "lucide-react";
import { useProducts } from "@/contexts/ProductContext";
import { useCategoryNames } from "@/hooks/useCategories";
import ProductCard from "@/components/ProductCard";

export default function OfertasPage() {
  const { products, loading: productsLoading } = useProducts();
  const { categoryNames, loading: categoriesLoading } = useCategoryNames();
  const [category, setCategory] = useState("Todas");
  const [search, setSearch] = useState("");

  // Criterio de oferta: tiene offerPrice < price e isActive
  const offerProducts = useMemo(() =>
    products.filter(p => p.isActive && !!(p.offerPrice && p.offerPrice > 0 && p.offerPrice < p.price)),
    [products]);

  // Usar las categorías oficiales de la API
  const categories = useMemo(() => ["Todas", ...categoryNames], [categoryNames]);

  const loading = productsLoading || categoriesLoading;

  const filtered = offerProducts.filter(p => {
    const catOk = category === "Todas" || (Array.isArray(p.categories) && p.categories.includes(category));
    const searchOk = p.name.toLowerCase().includes(search.toLowerCase()) || 
                    (p.description?.toLowerCase().includes(search.toLowerCase()) ?? false);
    return catOk && searchOk;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
        <div className="size-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <span className="text-gray-500 font-black uppercase tracking-widest text-[10px]">Cargando mejores ofertas...</span>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen">
      {/* Header Premium con diseño homogéneo */}
      <section className="bg-emerald-950 pt-16 pb-16 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-emerald-500/20 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-500/10 rounded-full blur-[80px] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-4 relative z-10 text-center sm:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest mb-4">
                <Sparkles className="size-3" />
                <span>Precios Especiales</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight leading-tight">
                Ofertas que <br />
                <span className="text-emerald-400">no puedes dejar pasar</span>
            </h1>
            <p className="text-emerald-100/60 max-w-lg mb-8 font-medium">
                Seleccionamos los productos más queridos con descuentos exclusivos por tiempo limitado. ¡Llena tu carrito ahorrando!
            </p>

            {/* Controles Compactos y Premium */}
            <div className="flex flex-col sm:flex-row gap-4 max-w-2xl bg-white/5 backdrop-blur-2xl p-4 rounded-3xl border border-white/10">
                <div className="flex-1 relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-emerald-400 group-focus-within:text-white transition-colors" />
                    <input 
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Buscar en ofertas..."
                        className="w-full bg-white/10 border border-white/10 text-white rounded-2xl py-3 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all placeholder:text-emerald-100/30 font-medium"
                    />
                </div>
                <div className="sm:w-64">
                    <select
                        value={category}
                        onChange={e => setCategory(e.target.value)}
                        className="w-full bg-white/10 border border-white/10 text-white rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all font-medium appearance-none cursor-pointer"
                    >
                        {categories.map(c => <option key={c} value={c} className="bg-emerald-950 text-white">{c}</option>)}
                    </select>
                </div>
            </div>
        </div>
      </section>

      {/* Grid de Productos */}
      <section className="py-16 max-w-7xl mx-auto px-4">
        {filtered.length === 0 ? (
            <div className="text-center py-24 bg-gray-50/50 rounded-[3rem] border border-dashed border-gray-200">
                <div className="size-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Search className="size-10 text-emerald-600" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-2">Sin resultados</h3>
                <p className="text-gray-500 font-medium max-w-sm mx-auto mb-8">No encontramos ofertas para "{search}" en esta categoría.</p>
                <Link href="/productos">
                    <button className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-900/10 active:scale-95">
                        Ver catálogo completo
                    </button>
                </Link>
            </div>
        ) : (
            <>
                <div className="flex items-center justify-between mb-10">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        Mostrando <span className="text-emerald-600">{filtered.length}</span> ofertas exclusivas
                    </p>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
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

      {/* Newsletter / Call to Action homogéneo */}
      <section className="py-20 border-t border-gray-100 bg-gray-50/30 border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 text-center">
            <h2 className="text-3xl font-black text-gray-900 mb-4 tracking-tight">¿No encontraste lo que buscabas?</h2>
            <p className="text-gray-500 mb-10 font-medium italic">"Lo mejor de Venezuela y Chile, siempre al alcance de tu mano."</p>
            <Link href="/productos">
                <button className="bg-white border border-gray-200 text-gray-900 px-10 py-5 rounded-3xl font-black uppercase text-[10px] tracking-widest hover:border-emerald-500 hover:text-emerald-600 transition-all shadow-xl shadow-gray-200/50 hover:shadow-emerald-200/20 active:scale-95 flex items-center gap-3 mx-auto">
                    Explorar toda la tienda
                    <Sparkles className="size-4" />
                </button>
            </Link>
        </div>
      </section>
    </div>
  );
}
