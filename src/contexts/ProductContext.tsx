"use client";

import React from 'react';
import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";

// Definición de tipos
export interface Product {
  id: string;
  name: string;
  price: number;
  priceOriginal?: number; // precio antes de descuento
  image: string;
  slug: string;
  description: string;
  categories: string[]; // Cambio: ahora es array de categorías
  stock: number;
  featured: boolean;
  createdAt: string;
  gallery?: string[];
  features?: string[];
  // Métricas ligeras (almacenadas localmente)
  viewCount?: number; // número de vistas de detalle
  orderClicks?: number; // número de intentos de pedido (WhatsApp / checkout)
}

interface ProductContextType {
  products: Product[];
  addProduct: (product: Omit<Product, "id" | "createdAt">) => void;
  updateProduct: (id: string, product: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  getProductById: (id: string) => Product | undefined;
  getProductBySlug: (slug: string) => Product | undefined;
  loading: boolean;
  trackProductView: (id: string) => void;
  trackOrderIntent: (id: string | string[]) => void;
}

// Crear el contexto (export para tests)
export const ProductContext = createContext<ProductContextType | undefined>(undefined);

// Datos iniciales adaptados a OLIVOMARKET (minimarket venezolano en Chile)
// Categorías principales: Bebidas, Panes, Víveres, Helados, Quesos, Cecinas, Mascotas, Higiene, Aseo
// IMPORTANT: Increment PRODUCT_DATA_VERSION whenever you change this seed so clients refresh.
const PRODUCT_DATA_VERSION = "5"; // bump to force refresh (multiple categories)

const initialProducts: Product[] = [
  {
    id: "1",
    name: "Refresco Maltín Polar 355ml",
    price: 1.7,
    priceOriginal: 1.9,
    image: "https://images.unsplash.com/photo-1603398938378-e54eab446dde?q=80&w=800&auto=format&fit=crop",
    slug: "refresco-maltin-polar-355ml",
    description: "Bebida maltosa tradicional venezolana, bien fría sabe a hogar.",
    categories: ["Bebidas", "venezolanos"],
    stock: 40,
    featured: true,
    createdAt: "2025-08-01",
    viewCount: 0,
    orderClicks: 0,
  },
  {
    id: "2",
    name: "Harina P.A.N. Amarilla 1Kg",
    price: 3.5,
    priceOriginal: 3.5,
    image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?q=80&w=800&auto=format&fit=crop",
    slug: "harina-pan-amarilla-1kg",
    description: "Harina precocida de maíz para tus arepas y cachapas. Calidad venezolana.",
    categories: ["Víveres", "venezolanos"],
    stock: 60,
    featured: true,
    createdAt: "2025-08-01",
    viewCount: 0,
    orderClicks: 0,
  },
  {
    id: "3",
    name: "Queso Llanero Semiduro 500g",
    price: 6.2,
    priceOriginal: 6.9,
    image: "https://images.unsplash.com/photo-1601004890684-d8cbf643f5f2?q=80&w=800&auto=format&fit=crop",
    slug: "queso-llanero-semiduro-500g",
    description: "Queso típico de los llanos, salado y perfecto para rallar o comer fresco.",
    categories: ["Quesos"],
    stock: 25,
    featured: true,
    createdAt: "2025-08-01",
    viewCount: 0,
    orderClicks: 0,
  },
  {
    id: "4",
    name: "Chorizo Ahumado Artesanal 300g",
    price: 5.2,
    priceOriginal: 5.2,
    image: "https://images.unsplash.com/photo-1603048722928-b735f0d47e1c?q=80&w=800&auto=format&fit=crop",
    slug: "chorizo-ahumado-artesanal-300g",
    description: "Cecina ahumada con especias, ideal para parrillas y desayunos criollos.",
    categories: ["Cecinas"],
    stock: 32,
    featured: false,
    createdAt: "2025-08-01",
    viewCount: 0,
    orderClicks: 0,
  },
  {
    id: "5",
    name: "Pan Andino Dulce Unidad",
    price: 1.2,
    priceOriginal: 1.2,
    image: "https://images.unsplash.com/photo-1608198093002-ad4e005484ec?q=80&w=800&auto=format&fit=crop",
    slug: "pan-andino-dulce",
    description: "Pan suave estilo andino con ligero dulzor, perfecto para el café.",
    categories: ["Panes"],
    stock: 50,
    featured: false,
    createdAt: "2025-08-01",
    viewCount: 0,
    orderClicks: 0,
  },
  {
    id: "6",
    name: "Helado de Coco Artesanal 1L",
    price: 6.9,
    priceOriginal: 7.5,
    image: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?q=80&w=800&auto=format&fit=crop",
    slug: "helado-de-coco-artesanal-1l",
    description: "Helado cremoso de coco estilo caribeño, refrescante y natural.",
    categories: ["Helados"],
    stock: 18,
    featured: true,
    createdAt: "2025-08-01",
    viewCount: 0,
    orderClicks: 0,
  },
  {
    id: "7",
    name: "Alimento Perro Adulto 2Kg",
    price: 8.9,
    priceOriginal: 8.9,
    image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=800&auto=format&fit=crop",
    slug: "alimento-perro-adulto-2kg",
    description: "Nutrición balanceada para tu mascota, energía y salud diaria.",
    categories: ["Mascotas"],
    stock: 22,
    featured: false,
    createdAt: "2025-08-01",
    viewCount: 0,
    orderClicks: 0,
  },
  {
    id: "8",
    name: "Jabón Azul Tradicional 200g",
    price: 1.4,
    priceOriginal: 1.4,
    image: "https://images.unsplash.com/photo-1608219992759-8148ecd4d73e?q=80&w=800&auto=format&fit=crop",
    slug: "jabon-azul-tradicional-200g",
    description: "Clásico jabón multiuso para ropa y limpieza, aroma a nostalgia.",
    categories: ["Aseo"],
    stock: 70,
    featured: false,
    createdAt: "2025-08-01",
    viewCount: 0,
    orderClicks: 0,
  },
  {
    id: "9",
    name: "Shampoo Herbal Familiar 750ml",
    price: 5.4,
    priceOriginal: 5.4,
    image: "https://images.unsplash.com/photo-1601046233603-a4c2aee4c51f?q=80&w=800&auto=format&fit=crop",
    slug: "shampoo-herbal-familiar-750ml",
    description: "Fórmula con extractos naturales para uso diario de toda la familia.",
    categories: ["Higiene"],
    stock: 30,
    featured: false,
    createdAt: "2025-08-01",
    viewCount: 0,
    orderClicks: 0,
  },
  {
    id: "10",
    name: "Café Molido Oscuro 500g",
    price: 6.2,
    priceOriginal: 6.2,
    image: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?q=80&w=800&auto=format&fit=crop",
    slug: "cafe-molido-oscuro-500g",
    description: "Café intenso de tueste oscuro, aroma profundo para comenzar el día.",
    categories: ["Víveres"],
    stock: 26,
    featured: true,
    createdAt: "2025-08-01",
    viewCount: 0,
    orderClicks: 0,
  },
  {
    id: "11",
    name: "Queso Guayanés Fresco 400g",
    price: 7.1,
    priceOriginal: 7.1,
    image: "https://images.unsplash.com/photo-1630383249896-831f33cbd1d5?q=80&w=800&auto=format&fit=crop",
    slug: "queso-guayanes-fresco-400g",
    description: "Queso suave, húmedo y elástico, perfecto para arepas y cachapas.",
    categories: ["Quesos", "venezolanos"],
    stock: 15,
    featured: false,
    createdAt: "2025-08-01",
    viewCount: 0,
    orderClicks: 0,
  },
  {
    id: "12",
    name: "Salchichón Tipo Campesino 250g",
    price: 4.6,
    priceOriginal: 4.6,
    image: "https://images.unsplash.com/photo-1601050690115-62df6aab2037?q=80&w=800&auto=format&fit=crop",
    slug: "salchichon-tipo-campesino-250g",
    description: "Embutido de sabor tradicional para tapas y desayunos.",
    categories: ["Cecinas"],
    stock: 28,
    featured: false,
    createdAt: "2025-08-01",
    viewCount: 0,
    orderClicks: 0,
  },
];

// Generar un ID único
const generateId = () => {
  return Math.random().toString(36).substring(2, 11);
};

// Generar un slug a partir del nombre del producto
const generateSlug = (name: string) => {
  return name
    .toLowerCase()
    .replace(/[^\w ]+/g, '')
    .replace(/ +/g, '-');
};

// Obtener la fecha actual en formato YYYY-MM-DD
const getCurrentDate = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

// Proveedor del contexto
export function ProductProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const STORAGE_KEY = "products";
  const VERSION_KEY = "products_version";
  
  // Carga inicial de productos desde localStorage (solo en el cliente)
  useEffect(() => {
    setMounted(true);
    setLoading(true);
    try {
      const storedVersion = localStorage.getItem(VERSION_KEY);
      const storedProductsRaw = localStorage.getItem(STORAGE_KEY);
      // If no version or version mismatch -> reseed
      if (!storedVersion || storedVersion !== PRODUCT_DATA_VERSION) {
        setProducts(initialProducts);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(initialProducts));
        localStorage.setItem(VERSION_KEY, PRODUCT_DATA_VERSION);
      } else if (storedProductsRaw) {
        const parsed = JSON.parse(storedProductsRaw);
        if (Array.isArray(parsed)) {
          // Normalizar para asegurar campos de métricas
          const normalized: Product[] = parsed.map((p: Product) => ({
            ...p,
            viewCount: p.viewCount ?? 0,
            orderClicks: p.orderClicks ?? 0,
          }));
          setProducts(normalized);
        } else {
          setProducts(initialProducts);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(initialProducts));
        }
      } else {
        // Version matches but no products stored -> seed
        setProducts(initialProducts);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(initialProducts));
      }
    } catch (e) {
      console.error("Error loading products, reseeding", e);
      setProducts(initialProducts);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initialProducts));
      localStorage.setItem(VERSION_KEY, PRODUCT_DATA_VERSION);
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Actualizar localStorage cuando cambian los productos
  useEffect(() => {
    if (mounted && !loading) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
      localStorage.setItem(VERSION_KEY, PRODUCT_DATA_VERSION);
    }
  }, [products, mounted, loading]);
  
  // Agregar nuevo producto
  const addProduct = (productData: Omit<Product, "id" | "createdAt">) => {
    const newProduct: Product = {
      ...productData,
      id: generateId(),
      createdAt: getCurrentDate(),
      slug: productData.slug || generateSlug(productData.name),
    };
    
    setProducts(prevProducts => [...prevProducts, newProduct]);
    return newProduct;
  };
  
  // Actualizar producto existente
  const updateProduct = (id: string, productData: Partial<Product>) => {
    setProducts(prevProducts => 
      prevProducts.map(product => 
        product.id === id 
          ? { 
              ...product, 
              ...productData,
              // Si se actualiza el nombre y no se proporciona un nuevo slug, generar uno nuevo
              slug: productData.slug || (productData.name ? generateSlug(productData.name) : product.slug)
            } 
          : product
      )
    );
  };
  
  // Eliminar producto
  const deleteProduct = (id: string) => {
    setProducts(prevProducts => prevProducts.filter(product => product.id !== id));
  };
  
  // Obtener producto por ID
  const getProductById = (id: string) => {
    return products.find(product => product.id === id);
  };
  
  // Obtener producto por slug
  const getProductBySlug = (slug: string) => {
    return products.find(product => product.slug === slug);
  };

  // Métricas: incrementar vista de producto
  const trackProductView = useCallback((id: string) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, viewCount: (p.viewCount ?? 0) + 1 } : p));
  }, []);

  // Métricas: intento de pedido (puede venir 1 id o varios)
  const trackOrderIntent = useCallback((idOrIds: string | string[]) => {
    const ids = Array.isArray(idOrIds) ? idOrIds : [idOrIds];
    setProducts(prev => prev.map(p => ids.includes(p.id) ? { ...p, orderClicks: (p.orderClicks ?? 0) + 1 } : p));
  }, []);
  
  // Valores del contexto
  const contextValue: ProductContextType = {
    products,
    addProduct,
    updateProduct,
    deleteProduct,
    getProductById,
    getProductBySlug,
    loading,
  trackProductView,
  trackOrderIntent,
  };
  
  return <ProductContext.Provider value={contextValue}>{children}</ProductContext.Provider>;
}

// Hook personalizado para usar el contexto
export function useProducts() {
  const context = useContext(ProductContext);
  
  if (context === undefined) {
    throw new Error("useProducts debe ser usado dentro de un ProductProvider");
  }
  
  return context;
}
