'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from 'react';

import type { ProductUI } from '@/types';
import {
  fetchAllProducts,
  searchProducts,
  saveProduct,
  deleteProduct,
} from '@/services/products';

// Type alias for ProductUI to maintain consistency
export type Product = ProductUI;

interface ProductContextType {
  products: Product[];
  loading: boolean;
  error?: string;
  refresh: () => Promise<void>;
  search: (q: string) => Promise<void>;
  getProductById: (id: string) => Product | undefined;
  trackProductView: (id: string) => void;
  trackOrderIntent: (id: string) => void;
  // Back-compat alias expected by some admin pages
  addProduct: (productData: Partial<Product>) => Promise<void>;
  createProduct: (productData: Partial<Product>) => Promise<void>;
  updateProduct: (id: string, productData: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  toggleFeatured: (id: string, value: boolean) => Promise<void>;
  toggleActive: (id: string, value: boolean) => Promise<void>;
}

export const ProductContext = createContext<ProductContextType | undefined>(undefined);

export function ProductProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);

  const normalize = (list: ProductUI[]): Product[] =>
    list.map((p) => ({
      ...p,
      featured: !!p.featured,
    }));

  const load = useCallback(async () => {
    let mounted = true;
    try {
      setLoading(true);
      setError(undefined);
      const data = await fetchAllProducts();
      if (mounted) {
        setProducts(normalize(data));
      }
    } catch (e: any) {
      if (mounted) {
        setError(e?.message || 'Error cargando productos');
      }
    } finally {
      if (mounted) {
        setLoading(false);
      }
    }
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const cleanup = load();
    return () => {
      cleanup.then((fn) => fn && fn());
    };
  }, [load]);  const refresh = async () => {
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
    // saveProduct({ barcode: id, viewCount: (getProductById(id)?.viewCount ?? 0) + 1 } as any).catch(()=>{});
  };

  const trackOrderIntent = (id: string) => {
    setProducts((prev) => prev.map(p => p.id === id ? ({ ...p, orderClicks: (p.orderClicks ?? 0) + 1 }) : p));
    // optional: persist to supabase (fire-and-forget)
    // saveProduct({ barcode: id, orderClicks: (getProductById(id)?.orderClicks ?? 0) + 1 } as any).catch(()=>{});
  };

  // Crea en la nube usando "barcode" como id
  const createProduct = async (productData: Partial<Product>) => {
    const barcode =
      String((productData as any).barcode ?? productData.id ?? '').trim();
    if (!barcode) throw new Error('Se requiere un código (barcode)');

    await saveProduct({
      barcode,
      name: productData.name ?? '',
      category: Array.isArray(productData.categories)
        ? productData.categories.join(', ')
        : (productData as any).category ?? null,
      purchase_price: 0,
      sale_price: Number(productData.price ?? 0),
      expiry_date: null,
      stock: Number(productData.stock ?? 0),
      image_url: (productData as any).image ?? null,
      gallery: (productData as any).gallery ?? null,
      featured: !!productData.featured,
      is_active: (productData as any).isActive ?? (productData as any).is_active ?? false,
      measurement_unit: (productData as any).measurementUnit ?? null,
      measurement_value: (productData as any).measurementValue ?? null,
      suggested_price: (productData as any).suggestedPrice ?? null,
      offer_price: (productData as any).offerPrice ?? null,
    } as any);

    await load();
  };

  // Actualiza en la nube por "id" (equivale a barcode)
  const updateProduct = async (id: string, productData: Partial<Product>) => {
    const barcode = String(id).trim();

    // Update product data in Supabase (includes optional image_url/gallery)
    await saveProduct({
      barcode,
      name: productData.name ?? '',
      category: Array.isArray(productData.categories)
        ? productData.categories.join(', ')
        : (productData as any).category ?? null,
      purchase_price: 0,
      sale_price: Number(productData.price ?? 0),
      expiry_date: null,
      stock: Number(productData.stock ?? 0),
      image_url: (productData as any).image ?? null,
      gallery: (productData as any).gallery ?? null,
      featured: productData.featured,
      is_active: (productData as any).isActive ?? (productData as any).is_active ?? null,
      measurement_unit: (productData as any).measurement_unit ?? (productData as any).measurementUnit ?? null,
      measurement_value: (productData as any).measurement_value ?? (productData as any).measurementValue ?? null,
      suggested_price: (productData as any).suggested_price ?? (productData as any).suggestedPrice ?? null,
      offer_price: (productData as any).offer_price ?? (productData as any).offerPrice ?? null,
    } as any);

    await load();
  };

  const deleteProductFn = async (id: string) => {
    await deleteProduct(String(id));
    await load();
  };

  const toggleFeatured = async (id: string, value: boolean) => {
    // optimistic update
    setProducts(prev => prev.map(p => p.id === id ? { ...p, featured: value } : p));
    try {
      const product = getProductById(id);
      if (!product) return;
      
      await saveProduct({
        barcode: id,
        name: product.name,
        category: Array.isArray(product.categories)
          ? product.categories.join(', ')
          : (product as any).category ?? null,
        purchase_price: 0,
        sale_price: Number(product.price),
        expiry_date: null,
        stock: Number(product.stock),
        image_url: (product as any).image ?? null,
        gallery: (product as any).gallery ?? null,
        featured: value,
        is_active: product.isActive, // Preserve active state
      } as any);
    } catch (e) {
      // rollback on error
      setProducts(prev => prev.map(p => p.id === id ? { ...p, featured: !value } : p));
      throw e;
    }
  };

  const toggleActive = async (id: string, value: boolean) => {
    // optimistic update
    setProducts(prev => prev.map(p => p.id === id ? { ...p, isActive: value } : p));
    try {
      const product = getProductById(id);
      if (!product) return;

      await saveProduct({
        barcode: id,
        name: product.name,
        category: Array.isArray(product.categories)
          ? product.categories.join(', ')
          : (product as any).category ?? null,
        purchase_price: 0,
        sale_price: Number(product.price),
        expiry_date: null,
        stock: Number(product.stock),
        image_url: (product as any).image ?? null,
        gallery: (product as any).gallery ?? null,
        featured: product.featured, // Preserve featured state
        is_active: value,
      } as any);
    } catch (e) {
      // rollback on error
      setProducts(prev => prev.map(p => p.id === id ? { ...p, isActive: !value } : p));
      throw e;
    }
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
  // Alias for compatibility
  addProduct: createProduct,
    createProduct,
    updateProduct,
    deleteProduct: deleteProductFn,
  toggleFeatured,
  toggleActive,
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
