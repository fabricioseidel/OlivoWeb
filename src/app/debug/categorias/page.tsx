"use client";

import { useProducts } from "@/contexts/ProductContext";
import { useCategories } from "@/hooks/useCategories";
import { useMemo, useState } from "react";

export default function DebugCategoriesPage() {
  const { products } = useProducts();
  const { categories, refetch } = useCategories();
  const [issyncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Función para sincronizar categorías
  const syncCategories = async () => {
    if (orphanCategories.length === 0) {
      setSyncMessage("No hay categorías para sincronizar");
      return;
    }

    setSyncing(true);
    setSyncMessage(null);

    try {
      const response = await fetch('/api/admin/sync-categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ categories: orphanCategories })
      });

      const result = await response.json();

      if (response.ok) {
        setSyncMessage(`✅ ${result.message}`);
        // Refrescar las categorías
        await refetch();
      } else {
        setSyncMessage(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      setSyncMessage(`❌ Error de conexión: ${error}`);
    } finally {
      setSyncing(false);
    }
  };

  // Extraer categorías únicas de productos
  const productCategories = useMemo(() => {
    const categorySet = new Set<string>();
    products.forEach(p => {
      if (Array.isArray(p.categories)) {
        p.categories.forEach(cat => categorySet.add(cat));
      }
    });
    return Array.from(categorySet).sort();
  }, [products]);

  // Categorías de la API
  const apiCategories = categories.map(c => c.name).sort();

  // Encontrar categorías que están en productos pero no en API
  const orphanCategories = productCategories.filter(pc => 
    !apiCategories.includes(pc)
  );

  // Encontrar categorías de API sin productos
  const emptyCategories = apiCategories.filter(ac => 
    !productCategories.includes(ac)
  );

  // Contar productos por categoría
  const productCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach(p => {
      if (Array.isArray(p.categories)) {
        p.categories.forEach(cat => {
          counts[cat] = (counts[cat] || 0) + 1;
        });
      }
    });
    return counts;
  }, [products]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Debug Categorías</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Categorías en Productos */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-3 text-blue-800">
            Categorías en Productos ({productCategories.length})
          </h2>
          <div className="space-y-1">
            {productCategories.map(cat => (
              <div key={cat} className="flex justify-between">
                <span className="text-blue-700">{cat}</span>
                <span className="text-blue-600 font-mono">
                  {productCounts[cat] || 0} productos
                </span>
              </div>
            ))}
            {productCategories.length === 0 && (
              <p className="text-blue-500 italic">No hay categorías en productos</p>
            )}
          </div>
        </div>

        {/* Categorías en API */}
        <div className="bg-green-50 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-3 text-green-800">
            Categorías en API ({apiCategories.length})
          </h2>
          <div className="space-y-1">
            {apiCategories.map(cat => (
              <div key={cat} className="flex justify-between">
                <span className="text-green-700">{cat}</span>
                <span className="text-green-600 font-mono">
                  {productCounts[cat] || 0} productos
                </span>
              </div>
            ))}
            {apiCategories.length === 0 && (
              <p className="text-green-500 italic">No hay categorías en API</p>
            )}
          </div>
        </div>

        {/* Categorías Huérfanas */}
        <div className="bg-red-50 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-3 text-red-800">
            ⚠️ Categorías Huérfanas ({orphanCategories.length})
          </h2>
          <p className="text-sm text-red-600 mb-2">
            Categorías que tienen productos pero no existen en la API:
          </p>
          <div className="space-y-1">
            {orphanCategories.map(cat => (
              <div key={cat} className="flex justify-between">
                <span className="text-red-700 font-mono">{cat}</span>
                <span className="text-red-600">
                  {productCounts[cat]} productos perdidos
                </span>
              </div>
            ))}
            {orphanCategories.length === 0 && (
              <p className="text-green-600 italic">✅ No hay categorías huérfanas</p>
            )}
          </div>
        </div>

        {/* Categorías Vacías */}
        <div className="bg-yellow-50 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-3 text-yellow-800">
            📭 Categorías Vacías ({emptyCategories.length})
          </h2>
          <p className="text-sm text-yellow-600 mb-2">
            Categorías de API sin productos asignados:
          </p>
          <div className="space-y-1">
            {emptyCategories.map(cat => (
              <div key={cat} className="text-yellow-700 font-mono">
                {cat}
              </div>
            ))}
            {emptyCategories.length === 0 && (
              <p className="text-green-600 italic">✅ Todas las categorías tienen productos</p>
            )}
          </div>
        </div>
      </div>

      {/* Recomendaciones */}
      <div className="mt-8 bg-gray-50 p-4 rounded-lg">
        <h2 className="text-lg font-semibold mb-3">🔧 Recomendaciones</h2>
        
        {orphanCategories.length > 0 && (
          <div className="mb-4 p-3 bg-red-100 rounded">
            <strong className="text-red-800">Problema detectado:</strong>
            <p className="text-red-700 mt-1 mb-3">
              Hay {orphanCategories.length} categorías en productos que no existen en tu panel de administración.
              Categorías faltantes: <strong>{orphanCategories.join(", ")}</strong>
            </p>
            
            <div className="flex items-center gap-3">
              <button
                onClick={syncCategories}
                disabled={issyncing}
                className={`px-4 py-2 rounded font-medium ${
                  issyncing
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                } text-white`}
              >
                {issyncing ? 'Sincronizando...' : 'Crear Categorías Automáticamente'}
              </button>
              
              {syncMessage && (
                <span className="text-sm font-medium">
                  {syncMessage}
                </span>
              )}
            </div>
          </div>
        )}
        
        {emptyCategories.length > 0 && (
          <div className="mb-4 p-3 bg-yellow-100 rounded">
            <strong className="text-yellow-800">Oportunidad:</strong>
            <p className="text-yellow-700 mt-1">
              Tienes {emptyCategories.length} categorías sin productos. 
              Puedes crear productos para estas categorías o desactivarlas si no las necesitas.
            </p>
          </div>
        )}
        
        {orphanCategories.length === 0 && emptyCategories.length === 0 && (
          <div className="p-3 bg-green-100 rounded">
            <strong className="text-green-800">✅ ¡Todo está correcto!</strong>
            <p className="text-green-700 mt-1">
              Todas las categorías están sincronizadas entre productos y API.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
