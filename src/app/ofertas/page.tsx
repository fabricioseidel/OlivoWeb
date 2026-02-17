"use client";

import Link from "next/link";
import { useProducts } from "@/contexts/ProductContext";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/contexts/ToastContext";
import OlivoButton from "@/components/OlivoButton";
import OlivoInput from "@/components/OlivoInput";
import Badge from "@/components/Badge";
import { useMemo, useState } from "react";
import { useCategoryNames } from "@/hooks/useCategories";
import ImageWithFallback from '@/components/ui/ImageWithFallback';
import { Search, Eye, ShoppingCart } from "lucide-react";

export default function OfertasPage() {
  const { products, loading: productsLoading } = useProducts();
  const { categoryNames, loading: categoriesLoading } = useCategoryNames();
  const { addToCart } = useCart();
  const { showToast } = useToast();
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
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-600"></div>
          <span className="text-gray-500 font-medium">Cargando mejores ofertas...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Ofertas Especiales</h1>
        <p className="text-gray-600 text-lg">Aprovecha nuestros descuentos limitados en productos seleccionados.</p>
      </div>

      {/* Controles */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Filtrar por Categoría</label>
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all cursor-pointer text-gray-700"
          >
            {categories.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="md:col-span-2">
          <OlivoInput
            label="Buscar Ofertas"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="¿Qué estás buscando hoy?"
            icon={<Search className="size-5" />}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-emerald-50 rounded-full">
              <Search className="h-8 w-8 text-emerald-600" />
            </div>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No encontramos ofertas con esos criterios</h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">Intenta cambiar los filtros o explora nuestro catálogo completo.</p>
          <Link href="/productos">
            <OlivoButton>Ver todos los productos</OlivoButton>
          </Link>
        </div>
      ) : (
        <>
          <p className="text-gray-600 mb-6 font-medium">Encontramos {filtered.length} {filtered.length === 1 ? "oferta" : "ofertas"} para ti</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {filtered.map(product => (
              <div key={product.id} className="group bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300">
                <Link href={`/productos/${product.slug}`} className="block relative overflow-hidden aspect-square">
                  <ImageWithFallback
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-in-out"
                  />
                  <div className="absolute top-3 left-3">
                    <Badge variant="error" className="shadow-lg">¡Oferta!</Badge>
                  </div>
                  {/* Overlay en hover */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300" />
                </Link>

                <div className="p-5">
                  <div className="mb-3">
                    {Array.isArray(product.categories) && product.categories.length > 0 && (
                      <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1 block">
                        {product.categories[0]}
                      </span>
                    )}
                    <Link href={`/productos/${product.slug}`}>
                      <h3 className="text-lg font-bold text-gray-900 leading-tight group-hover:text-emerald-600 transition-colors line-clamp-1" title={product.name}>
                        {product.name}
                      </h3>
                    </Link>
                  </div>

                  <div className="flex items-center gap-3 mb-4 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {product.viewCount ?? 0}</span>
                    <span className="flex items-center gap-1"><ShoppingCart className="h-3 w-3" /> {product.orderClicks ?? 0}</span>
                  </div>

                  <div className="flex items-end justify-between mb-5">
                    <div className="flex flex-col">
                      {product.priceOriginal && product.priceOriginal > product.price && (
                        <span className="text-sm text-gray-400 line-through decoration-red-400 decoration-1 mb-0.5">
                          ${product.priceOriginal.toFixed(2)}
                        </span>
                      )}
                      <span className="text-2xl font-bold text-emerald-600 tracking-tight">
                        ${product.price.toFixed(2)}
                      </span>
                    </div>
                    {product.priceOriginal && product.priceOriginal > product.price && (
                      <Badge variant="error" className="mb-1">
                        -{Math.round(((product.priceOriginal - product.price) / product.priceOriginal) * 100)}%
                      </Badge>
                    )}
                  </div>

                  <OlivoButton
                    fullWidth
                    onClick={() => {
                      addToCart(product);
                      showToast(`¡${product.name} añadido al carrito!`, 'success');
                    }}
                    className="shadow-sm hover:shadow-emerald-200/50"
                  >
                    Agregar al Carrito
                  </OlivoButton>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
