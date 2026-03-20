"use client";

import React from 'react';
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { CartItem } from '@/types';
import { useToast } from "./ToastContext";

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (product: Omit<CartItem, "quantity">, quantity?: number) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  validateCartWithServer: () => Promise<boolean>;
  subtotal: number;
  total: number;
  shippingCost: number;
  itemCount: number;
  isSyncing: boolean;
}

// Crear el contexto
const CartContext = createContext<CartContextType | undefined>(undefined);

// Proveedor del contexto
export function CartProvider({ children }: { children: ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const { showToast } = useToast();

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

  // Calcular costo de envío (0 por defecto, se calcula en Checkout)
  const shippingCost = 0;

  // Calcular total
  const total = subtotal + shippingCost;

  // Contar el número total de artículos
  const itemCount = cartItems.reduce((count, item) => count + item.quantity, 0);

  // Agregar producto al carrito
  const addToCart = useCallback((product: Omit<CartItem, "quantity">, quantity: number = 1) => {
    const qty = Math.max(1, Math.floor(quantity || 1));
    setCartItems(prevItems => {
      const existingItem = prevItems.find(item => item.id === product.id);
      if (existingItem) {
        return prevItems.map(item =>
          item.id === product.id ? { ...item, quantity: item.quantity + qty } : item
        );
      } else {
        return [...prevItems, { ...product, quantity: qty }];
      }
    });
  }, []);

  // Eliminar producto del carrito
  const removeFromCart = useCallback((id: string) => {
    setCartItems(prevItems => prevItems.filter(item => item.id !== id));
  }, []);

  // Actualizar cantidad de un producto
  const updateQuantity = useCallback((id: string, quantity: number) => {
    if (quantity < 1) return;

    setCartItems(prevItems =>
      prevItems.map(item => (item.id === id ? { ...item, quantity } : item))
    );
  }, []);

  // Vaciar carrito
  const clearCart = useCallback(() => {
    setCartItems([]);
    localStorage.removeItem('cart');
    localStorage.removeItem('cartItems');
  }, []);

  // Validación con el servidor
  const validateCartWithServer = useCallback(async () => {
    if (cartItems.length === 0) return true;
    
    setIsSyncing(true);
    try {
      const response = await fetch('/api/cart/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: cartItems.map(i => ({ id: i.id, quantity: i.quantity, price: i.price })) })
      });

      const data = await response.json();

      if (data.updates && data.updates.length > 0) {
        let needsUpdate = false;
        const newItems = cartItems.map(item => {
          const update = data.updates.find((u: any) => u.id === item.id);
          if (update) {
            needsUpdate = true;
            if (update.priceChanged) showToast(`El precio de ${item.name} ha cambiado`, "info");
            if (update.insufficientStock) {
              if (update.availableQty === 0) {
                showToast(`${item.name} se ha agotado`, "error");
              } else {
                showToast(`Stock ajustado para ${item.name} (${update.availableQty} disp.)`, "warning");
              }
            }
            
            return { 
              ...item, 
              price: update.newPrice ?? item.price,
              quantity: update.availableQty ?? item.quantity 
            };
          }
          return item;
        }).filter(item => item.quantity > 0);

        if (needsUpdate) setCartItems(newItems);
        return false; // False significa que hubo cambios (no puede continuar el checkout tal cual)
      }
      return true; // OK
    } catch (error) {
      console.error("Cart validation failed", error);
      return true; // No bloqueamos si falla el server, asumimos true localmente
    } finally {
      setIsSyncing(false);
    }
  }, [cartItems, showToast]);

  const contextValue: CartContextType = {
    cartItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    validateCartWithServer,
    subtotal,
    total,
    shippingCost,
    itemCount,
    isSyncing,
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
