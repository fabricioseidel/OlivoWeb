import { useState, useEffect, useCallback } from 'react';

export type Category = {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  image?: string;
  isActive?: boolean;
};

export function useCategories() {
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
      
      // Solo categorías activas para uso público
      const activeCategories = data.filter(cat => cat.isActive !== false);
      setCategories(activeCategories);
    } catch (err: any) {
      console.error('Error cargando categorías:', err);
      setError(err.message || 'Error desconocido');
      // Fallback a categoría por defecto
      setCategories([{ id: 'general', name: 'General' }]);
    } finally {
      setLoading(false);
    }
  }, []);

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
