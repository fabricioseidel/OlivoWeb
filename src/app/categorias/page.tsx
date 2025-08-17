"use client";

import Link from "next/link";
import { useProducts } from "@/contexts/ProductContext";
import { useMemo, useState, useEffect } from "react";

type PublicCategory = {
  id?: string;
  name: string;
  slug?: string;
  image?: string | null;
  count?: number;
};

export default function CategoriasPage() {
  const { products, loading: productsLoading } = useProducts();
  const [apiCategories, setApiCategories] = useState<PublicCategory[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageTimestamp, setImageTimestamp] = useState(Date.now());
  
  // Función mejorada para imágenes con caché-busting
  const getImageWithCacheBusting = (imageUrl: string | null | undefined) => {
    if (!imageUrl) return null;
    const separator = imageUrl.includes('?') ? '&' : '?';
    return `${imageUrl}${separator}t=${imageTimestamp}&bust=${Math.random().toString(36).slice(2)}`;
  };

  // Cargar categorías oficiales desde la API para obtener imágenes y metadatos
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/categories', { cache: 'no-store' });
        const body = await res.json().catch(() => null);
        console.debug('Categorias API response:', body);
        if (!cancelled && res.ok && Array.isArray(body)) {
          const mapped = body.map((c: any) => ({ 
            name: c.name, 
            image: c.image, 
            slug: c.slug,
            id: c.id 
          }));
          setApiCategories(mapped);
          // Actualizar timestamp para forzar recarga de imágenes
          setImageTimestamp(Date.now());
        }
      } catch (e) {
        console.warn('No se pudieron cargar categorias desde API', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  // Siempre calcular el conteo real desde los productos en localStorage
  const finalCategories = useMemo(() => {
    if (!apiCategories || apiCategories.length === 0) return [];
    // Contar productos por categoría
    const productCountMap = new Map<string, number>();
    const categoryImageMap = new Map<string, string>();
    products.forEach(p => {
      if (Array.isArray(p.categories)) {
        p.categories.forEach(cat => {
          productCountMap.set(cat, (productCountMap.get(cat) || 0) + 1);
          if (!categoryImageMap.has(cat) && p.image) {
            categoryImageMap.set(cat, p.image);
          }
        });
      }
    });
    // Mostrar todas las categorías oficiales, tengan productos o no
    const result: PublicCategory[] = [];
    // Agregar todas las categorías oficiales con sus conteos
    apiCategories.forEach(apiCat => {
      const count = productCountMap.get(apiCat.name) || 0;
      result.push({
        ...apiCat,
        count
      });
    });
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [products, apiCategories]);

  const showLoading = loading || productsLoading;
  const display = finalCategories;

  if (loading) {
    return <div className="p-8 text-center text-gray-500"><span className="animate-pulse">Cargando categorías...</span></div>;
  }
  if (!apiCategories || apiCategories.length === 0) {
    return <div className="p-8 text-center text-gray-500">No se encontraron categorías.</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Categorías</h1>
        <p className="text-gray-600">Explora los productos agrupados por categoría.</p>
      </div>

      {showLoading ? (
        <p className="text-gray-500">Cargando categorías...</p>
      ) : display.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg shadow-sm">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay categorías</h3>
          <p className="text-gray-500">Aún no se han agregado productos.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {display.map(cat => (
            <Link key={cat.name} href={`/categorias/${encodeURIComponent(cat.name)}`} className="group block bg-white rounded-lg shadow hover:shadow-md transition overflow-hidden">
              <div className="h-40 overflow-hidden bg-gray-100">
                {cat.image ? (
                  <img 
                    key={`cat-${cat.name}-${imageTimestamp}`}
                    src={getImageWithCacheBusting(cat.image) || ''} 
                    alt={cat.name} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">Sin imagen</div>
                )}
              </div>
              <div className="p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-1 line-clamp-1">{cat.name}</h3>
                <p className="text-sm text-gray-500">{cat.count ?? 0} {(cat.count ?? 0) === 1 ? 'producto' : 'productos'}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
