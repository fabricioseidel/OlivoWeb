"use client";

import Link from "next/link";
import { useProducts } from "@/contexts/ProductContext";
import { useCart } from "@/contexts/CartContext";
import Button from "@/components/ui/Button";
import { useMemo, useState } from "react";
import { useCategoryNames } from "@/hooks/useCategories";

export default function OfertasPage() {
  const { products, loading: productsLoading } = useProducts();
  const { categoryNames, loading: categoriesLoading } = useCategoryNames();
  const { addToCart } = useCart();
  const [category, setCategory] = useState("Todas");
  const [search, setSearch] = useState("");

  // Criterio de oferta: tiene priceOriginal > price
  const offerProducts = useMemo(() => products.filter(p => (p.priceOriginal || 0) > p.price), [products]);

  // Usar las categorías oficiales de la API en lugar de las derivadas de productos
  const categories = useMemo(() => ["Todas", ...categoryNames], [categoryNames]);

  const loading = productsLoading || categoriesLoading;

  const filtered = offerProducts.filter(p => {
    const catOk = category === "Todas" || (Array.isArray(p.categories) && p.categories.includes(category));
    const searchOk = p.name.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase());
    return catOk && searchOk;
  });

  if (loading) {
    return <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center"><span className="animate-pulse text-gray-500">Cargando ofertas...</span></div>;
  }
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Ofertas</h1>
        <p className="text-gray-600">Productos destacados y promociones especiales.</p>
      </div>

      {/* Controles */}
      <div className="bg-white p-4 rounded-lg shadow-sm mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
          <select value={category} onChange={e => setCategory(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
            {categories.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Buscar</label>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar ofertas..." className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg shadow-sm">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay ofertas disponibles</h3>
          <p className="text-gray-500 mb-4">Vuelve más tarde o revisa todos los productos.</p>
          <Link href="/productos" className="inline-block">
            <Button>Ver productos</Button>
          </Link>
        </div>
      ) : (
        <>
          <p className="text-gray-600 mb-4">{filtered.length} {filtered.length === 1 ? "oferta" : "ofertas"} encontradas</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filtered.map(product => (
              <div key={product.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                <Link href={`/productos/${product.slug}`}>
                  <div className="relative h-48 overflow-hidden">
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" />
                    <span className="absolute top-2 left-2 bg-red-600 text-white text-xs font-semibold px-2 py-1 rounded">Oferta</span>
                  </div>
                </Link>
                <div className="p-4">
                  <Link href={`/productos/${product.slug}`}> 
                    <h3 className="text-lg font-medium text-gray-900 mb-1 line-clamp-1">{product.name}</h3>
                  </Link>
                  <div className="flex items-center gap-2 mb-1 text-[11px] text-gray-500">
                    <span>👁️ {product.viewCount ?? 0}</span>
                    <span>🛒 {product.orderClicks ?? 0}</span>
                  </div>
                  {Array.isArray(product.categories) && product.categories.length > 0 && (
                    <div className="mt-2 text-xs text-gray-400">Categorías: {product.categories.join(', ')}</div>
                  )}
                  <div className="mb-4 flex items-center gap-2">
                    <p className="text-blue-600 font-semibold">$ {product.price.toFixed(2)}</p>
                    {product.priceOriginal && product.priceOriginal > product.price && (
                      <>
                        <span className="text-xs line-through text-gray-400">$ {product.priceOriginal.toFixed(2)}</span>
                        <span className="text-xs bg-red-100 text-red-600 font-semibold px-1.5 py-0.5 rounded">
                          -{Math.round(((product.priceOriginal - product.price)/product.priceOriginal)*100)}%
                        </span>
                      </>
                    )}
                  </div>
                  <Button fullWidth onClick={() => addToCart(product)}>Agregar al Carrito</Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
