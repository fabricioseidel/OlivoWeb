"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useProducts } from "@/contexts/ProductContext";
import { useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import { useCart } from "@/contexts/CartContext";
import { useCategories } from "@/hooks/useCategories";

export default function CategoriaDetallePage() {
  const params = useParams();
    const raw = params?.categoria as string | undefined;
  const decoded = raw ? decodeURIComponent(raw) : "";
  const { products, loading: productsLoading } = useProducts();
  const { categories, loading: categoriesLoading } = useCategories();
  const { addToCart } = useCart();
  const [sortBy, setSortBy] = useState("default");
  const [search, setSearch] = useState("");

  const loading = productsLoading || categoriesLoading;

  // Encontrar la categoría por slug o por nombre
  const categoryName = useMemo(() => {
    if (!categories) return decoded;
    const found = categories.find(c => c.slug === raw || c.name === decoded);
    return found?.name || decoded;
  }, [categories, raw, decoded]);

  // Filtrar productos por categoría
  const filtered = useMemo(() => {
    return products.filter(p => Array.isArray(p.categories) && p.categories.includes(categoryName));
  }, [products, categoryName]);

  // Ordenar y buscar
  const sorted = useMemo(() => {
    let arr = [...filtered];
    if (search) {
      arr = arr.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase()));
    }
    switch (sortBy) {
      case "price-asc":
        arr.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        arr.sort((a, b) => b.price - a.price);
        break;
      case "name-asc":
        arr.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "name-desc":
        arr.sort((a, b) => b.name.localeCompare(a.name));
        break;
      default:
        break;
    }
    return arr;
  }, [filtered, sortBy, search]);

  if (loading) {
    return <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center"><span className="animate-pulse text-gray-500">Cargando productos...</span></div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">{categoryName || 'Categoría'}</h1>
          <p className="text-gray-600">{sorted.length} {sorted.length === 1 ? 'producto' : 'productos'} en esta categoría</p>
        </div>
        <Link href="/categorias" className="text-blue-600 hover:underline text-sm">&larr; Ver todas</Link>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ordenar por</label>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
            <option value="default">Relevancia</option>
            <option value="price-asc">Precio: Menor a Mayor</option>
            <option value="price-desc">Precio: Mayor a Menor</option>
            <option value="name-asc">Nombre: A-Z</option>
            <option value="name-desc">Nombre: Z-A</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Buscar</label>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar dentro de la categoría..." className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg shadow-sm">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay productos</h3>
          <p className="text-gray-500 mb-4">No encontramos productos que coincidan con tu búsqueda.</p>
          <Button onClick={() => {setSearch(''); setSortBy('default');}}>Restablecer filtros</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {sorted.map(product => (
            <div key={product.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
              <Link href={`/productos/${product.slug}`}> 
                <div className="relative h-48 overflow-hidden">
                  <img src={product.image} alt={product.name} className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" />
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
                <div className="flex items-center justify-between mt-2">
                  <span className="text-lg font-bold text-gray-900">${product.price.toFixed(2)}</span>
                  <Button onClick={() => addToCart(product)}>Agregar</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  }
