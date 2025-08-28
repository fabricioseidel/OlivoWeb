'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from 'react';

import type { ProductUI } from '@/services/products';
import {
  fetchAllProducts,
  searchProducts,
  upsertProductToCloud,
  deleteProductFromCloud,
} from '@/services/products';

export interface Product extends ProductUI {}

interface ProductContextType {
  products: Product[];
  loading: boolean;
  error?: string;
  refresh: () => Promise<void>;
  search: (q: string) => Promise<void>;
  getProductById: (id: string) => Product | undefined;
  trackProductView: (id: string) => void;
  trackOrderIntent: (id: string) => void;
  createProduct: (productData: Partial<Product>) => Promise<void>;
  updateProduct: (id: string, productData: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export function ProductProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);

  const normalize = (list: ProductUI[]): Product[] =>
    list.map((p) => ({
      ...p,
      // asegura boolean para evitar error en admin/productos/[id]
      featured: !!p.featured,
    }));

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(undefined);
      const data = await fetchAllProducts();
      setProducts(normalize(data));
    } catch (e: any) {
      setError(e?.message || 'Error cargando productos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = async () => {
    await load();
  };

  const search = async (q: string) => {
    try {
      setLoading(true);
      setError(undefined);
      const data = q.trim()
        ? await searchProducts(q)
        : await fetchAllProducts();
      setProducts(normalize(data));
    } catch (e: any) {
      setError(e?.message || 'Error buscando productos');
    } finally {
      setLoading(false);
    }
  };

  const getProductById = (id: string) =>
    products.find((p) => String(p.id) === String(id));

  const trackProductView = (id: string) => {
    setProducts((prev) => prev.map(p => p.id === id ? ({ ...p, viewCount: (p.viewCount ?? 0) + 1 }) : p));
    // optional: persist to supabase (fire-and-forget)
    // upsertProductToCloud({ barcode: id, viewCount: (getProductById(id)?.viewCount ?? 0) + 1 } as any).catch(()=>{});
  };

  const trackOrderIntent = (id: string) => {
    setProducts((prev) => prev.map(p => p.id === id ? ({ ...p, orderClicks: (p.orderClicks ?? 0) + 1 }) : p));
    // optional: persist to supabase (fire-and-forget)
    // upsertProductToCloud({ barcode: id, orderClicks: (getProductById(id)?.orderClicks ?? 0) + 1 } as any).catch(()=>{});
  };

  // Crea en la nube usando "barcode" como id
  const createProduct = async (productData: Partial<Product>) => {
    const barcode =
      String((productData as any).barcode ?? productData.id ?? '').trim();
    if (!barcode) throw new Error('Se requiere un código (barcode)');

    await upsertProductToCloud({
      barcode,
      name: productData.name ?? '',
      category: Array.isArray(productData.categories)
        ? productData.categories.join(', ')
        : (productData as any).category ?? null,
      purchase_price: 0,
      sale_price: Number(productData.price ?? 0),
      expiry_date: null,
      stock: Number(productData.stock ?? 0),
      // evita mezcla || con ?? — usa solo ?? con paréntesis
      image_url:
        ((productData as any).image ?? (productData as any).image_url) ?? null,
    } as any);

    await load();
  };

  // Actualiza en la nube por "id" (equivale a barcode)
  const updateProduct = async (id: string, productData: Partial<Product>) => {
    const barcode = String(id).trim();

    await upsertProductToCloud({
      barcode,
      name: productData.name ?? '',
      category: Array.isArray(productData.categories)
        ? productData.categories.join(', ')
        : (productData as any).category ?? null,
      purchase_price: 0,
      sale_price: Number(productData.price ?? 0),
      expiry_date: null,
      stock: Number(productData.stock ?? 0),
      image_url:
        ((productData as any).image ?? (productData as any).image_url) ?? null,
    } as any);

    await load();
  };

  const deleteProduct = async (id: string) => {
    await deleteProductFromCloud(String(id));
    await load();
  };

  const contextValue: ProductContextType = {
    products,
    loading,
    error,
    refresh,
    search,
    getProductById,
  trackProductView,
  trackOrderIntent,
    createProduct,
    updateProduct,
    deleteProduct,
  };

  return (
    <ProductContext.Provider value={contextValue}>
      {children}
    </ProductContext.Provider>
  );
}

export function useProducts() {
  const ctx = useContext(ProductContext);
  if (!ctx) {
    throw new Error('useProducts debe usarse dentro de ProductProvider');
  }
  return ctx;
}
