"use client";

import React from 'react';
import { createContext, useContext, useState, useEffect, ReactNode } from "react";

// Definición de tipos
export interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  slug: string;
  quantity: number;
}

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (product: Omit<CartItem, "quantity">) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  subtotal: number;
  total: number;
  shippingCost: number;
  itemCount: number;
}

// Crear el contexto
const CartContext = createContext<CartContextType | undefined>(undefined);

// Proveedor del contexto
export function CartProvider({ children }: { children: ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [mounted, setMounted] = useState(false);
  
  // Carga inicial del carrito desde localStorage (solo en el cliente)
  useEffect(() => {
    setMounted(true);
    try {
      const storedCart = localStorage.getItem("cart");
      if (storedCart) {
        const parsedCart = JSON.parse(storedCart);
        if (Array.isArray(parsedCart)) {
          // Validar y limpiar los datos del carrito
          const validatedCart = parsedCart.filter(item => 
            item && 
            typeof item === 'object' && 
            typeof item.id === 'string' &&
            typeof item.name === 'string' &&
            typeof item.price === 'number' &&
            typeof item.quantity === 'number' &&
            !item.title // Filtrar elementos con 'title' (datos corruptos)
          ).map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            image: item.image || '',
            slug: item.slug || '',
            quantity: item.quantity
          }));
          setCartItems(validatedCart);
        } else {
          // Si no es un array, inicializar con un array vacío
          setCartItems([]);
          localStorage.setItem("cart", JSON.stringify([]));
        }
      }
    } catch (error) {
      console.error("Error parsing cart data:", error);
      // En caso de error, reiniciar el carrito
      setCartItems([]);
      localStorage.setItem("cart", JSON.stringify([]));
    }
  }, []);
  
  // Actualizar localStorage cuando cambia el carrito
  useEffect(() => {
    if (mounted) {
      localStorage.setItem("cart", JSON.stringify(cartItems));
    }
  }, [cartItems, mounted]);
  
  // Calcular subtotal
  const subtotal = cartItems.reduce((total, item) => total + item.price * item.quantity, 0);
  
  // Calcular costo de envío (ejemplo simple)
  const shippingCost = subtotal > 0 ? 10 : 0;
  
  // Calcular total
  const total = subtotal + shippingCost;
  
  // Contar el número total de artículos
  const itemCount = cartItems.reduce((count, item) => count + item.quantity, 0);
  
  // Agregar producto al carrito
  const addToCart = (product: Omit<CartItem, "quantity">) => {
    setCartItems(prevItems => {
      // Verificar si el producto ya está en el carrito
      const existingItem = prevItems.find(item => item.id === product.id);
      
      if (existingItem) {
        // Incrementar la cantidad si ya existe
        return prevItems.map(item =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      } else {
        // Agregar nuevo producto con cantidad 1
        return [...prevItems, { ...product, quantity: 1 }];
      }
    });
  };
  
  // Eliminar producto del carrito
  const removeFromCart = (id: string) => {
    setCartItems(prevItems => prevItems.filter(item => item.id !== id));
  };
  
  // Actualizar cantidad de un producto
  const updateQuantity = (id: string, quantity: number) => {
    if (quantity < 1) return;
    
    setCartItems(prevItems =>
      prevItems.map(item => (item.id === id ? { ...item, quantity } : item))
    );
  };
  
  // Vaciar carrito
  const clearCart = () => {
    setCartItems([]);
    localStorage.removeItem('cart');
    localStorage.removeItem('cartItems');
  };
  
  // Valores del contexto
  const contextValue: CartContextType = {
    cartItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    subtotal,
    total,
    shippingCost,
    itemCount,
  };
  
  return <CartContext.Provider value={contextValue}>{children}</CartContext.Provider>;
}

// Hook personalizado para usar el contexto
export function useCart() {
  const context = useContext(CartContext);
  
  if (context === undefined) {
    throw new Error("useCart debe ser usado dentro de un CartProvider");
  }
  
  return context;
}
