import { useState, useEffect, useCallback } from 'react';

export type Category = {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  image?: string;
  isActive?: boolean;
  /** Todo lo que existe en la tabla (lo usa el admin). */
  productsCount?: number;
  /** Solo lo que la tienda muestra de verdad; es el número que ve el cliente. */
  visibleProductsCount?: number;
};

/**
 * @param opciones.incluirInactivas El panel necesita ver TODAS las categorías
 * para poder asignarlas. Una categoría de temporada como "Fiestas Patrias" se
 * apaga para esconderla de la tienda, y al apagarla desaparecía también del
 * selector del producto: quedaba imposible marcar un producto como
 * dieciochero desde el panel, que es justo cuando hace falta.
 */
export function useCategories(opciones?: { incluirInactivas?: boolean }) {
  const incluirInactivas = opciones?.incluirInactivas ?? false;
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await fetch('/api/categories', { cache: 'no-store' });
      if (!res.ok) {
        throw new Error('No se pudieron cargar las categorías');
      }
      
      const data = await res.json();
      if (!Array.isArray(data)) {
        throw new Error('Respuesta inválida del servidor');
      }
      
      // La tienda pública sólo muestra las activas; el panel las necesita todas.
      setCategories(incluirInactivas ? data : data.filter(cat => cat.isActive !== false));
    } catch (err: any) {
      console.error('Error cargando categorías:', err);
      setError(err.message || 'Error desconocido');
      // Fallback a categoría por defecto
      setCategories([{ id: 'general', name: 'General' }]);
    } finally {
      setLoading(false);
    }
  }, [incluirInactivas]);

  useEffect(() => {
    let cancelled = false;
    
    const runLoad = async () => {
      await loadCategories();
      if (cancelled) return;
    };

    runLoad();
    return () => { cancelled = true; };
  }, [loadCategories]);

  return { categories, loading, error, refetch: loadCategories };
}

export function useCategoryNames() {
  const { categories, loading, error } = useCategories();
  
  // Devolver solo nombres para selects simples
  const categoryNames = categories.map(cat => cat.name);
  
  return { categoryNames, loading, error };
}
