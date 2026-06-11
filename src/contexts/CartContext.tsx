"use client";

import React from 'react';
import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from "react";
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
    console.group("[OLIVO:cart] 🛍️ Inicializando carrito desde localStorage");
    try {
      const storedCart = localStorage.getItem("cart");
      console.log("[OLIVO:cart] raw localStorage:", storedCart ? `${storedCart.length} chars` : "vacío");
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
          console.log(`[OLIVO:cart] ✅ ${validatedCart.length} items cargados`, validatedCart.map(i => `${i.name} x${i.quantity} $${i.price}`));
          setCartItems(validatedCart);
        } else {
          console.warn("[OLIVO:cart] ⚠️ localStorage no era array, reiniciando");
          setCartItems([]);
          localStorage.setItem("cart", JSON.stringify([]));
        }
      } else {
        console.log("[OLIVO:cart] carrito vacío");
      }
    } catch (error) {
      console.error("[OLIVO:cart] ❌ Error parseando carrito:", error);
      setCartItems([]);
      localStorage.setItem("cart", JSON.stringify([]));
    } finally {
      console.groupEnd();
    }
  }, []);

  // Actualizar localStorage cuando cambia el carrito
  useEffect(() => {
    if (mounted) {
      localStorage.setItem("cart", JSON.stringify(cartItems));
    }
  }, [cartItems, mounted]);

  // Calcular subtotal
  const subtotal = useMemo(
    () => cartItems.reduce((total, item) => total + item.price * item.quantity, 0),
    [cartItems]
  );
  const shippingCost = 0;
  const total = subtotal + shippingCost;
  const itemCount = useMemo(
    () => cartItems.reduce((count, item) => count + item.quantity, 0),
    [cartItems]
  );

  // Agregar producto al carrito
  const addToCart = useCallback((product: Omit<CartItem, "quantity">, quantity: number = 1) => {
    const qty = Math.max(1, Math.floor(quantity || 1));
    setCartItems(prevItems => {
      const existingItem = prevItems.find(item => item.id === product.id);
      if (existingItem) {
        const newQty = existingItem.quantity + qty;
        console.log(`[OLIVO:cart] ➕ UPDATE "${product.name}" → qty ${existingItem.quantity} → ${newQty} (precio: $${product.price})`);
        return prevItems.map(item =>
          item.id === product.id ? { ...item, quantity: newQty } : item
        );
      } else {
        console.log(`[OLIVO:cart] 🆕 ADD "${product.name}" qty:${qty} precio:$${product.price} id:${product.id}`);
        return [...prevItems, { ...product, quantity: qty }];
      }
    });
  }, []);

  // Eliminar producto del carrito
  const removeFromCart = useCallback((id: string) => {
    setCartItems(prevItems => {
      const item = prevItems.find(i => i.id === id);
      console.log(`[OLIVO:cart] 🗑️ REMOVE "${item?.name ?? id}"`);
      return prevItems.filter(i => i.id !== id);
    });
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

  // Validación con el servidor — actualiza el carrito si hay cambios de stock o precio
  const validateCartWithServer = useCallback(async () => {
    if (cartItems.length === 0) {
      console.log("[OLIVO:cart:validate] carrito vacío, skip validación");
      return true;
    }
    console.group(`[OLIVO:cart:validate] 🔍 Validando ${cartItems.length} items con servidor`);
    console.table(cartItems.map(i => ({ id: i.id, nombre: i.name, qty: i.quantity, precio: i.price })));
    setIsSyncing(true);
    try {
      const response = await fetch('/api/cart/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: cartItems.map(i => ({ id: i.id, quantity: i.quantity, price: i.price })) })
      });

      const data = await response.json();
      console.log('[OLIVO:cart:validate] 📦 Respuesta servidor:', { updates: data.updates?.length ?? 0, detalle: data.updates });

      if (data.updates && data.updates.length > 0) {
        let cartChanged = false;
        const messages: string[] = [];
        
        const nextItems = cartItems.map(item => {
          const update = data.updates.find((u: any) => u.id === item.id);
          if (!update) return item;
          const updatedItem = { ...item };

          // 1. Validar Precio
          if (update.priceChanged) {
            updatedItem.price = update.newPrice;
            messages.push(`El precio de ${item.name} cambió.`);
            cartChanged = true;
          }

          // 2. Validar Stock
          if (update.insufficientStock) {
            if (update.availableQty <= 0) {
              messages.push(`${item.name} se agotó y fue quitado del carrito.`);
              cartChanged = true;
              return null; // Marcar para eliminar
            } else if (item.quantity > update.availableQty) {
              updatedItem.quantity = update.availableQty;
              messages.push(`Ajustamos ${item.name} a ${update.availableQty} unidades por stock.`);
              cartChanged = true;
            }
          }

          return updatedItem;
        }).filter(Boolean) as CartItem[];

        if (cartChanged) {
          console.warn("[OLIVO:cart:validate] ⚠️ Carrito modificado:", messages);
          setCartItems(nextItems);
          if (messages.length > 2) {
            showToast("Varios productos en tu carrito fueron actualizados por cambios en stock o precio.", "warning");
          } else {
            messages.forEach(m => showToast(m, "warning"));
          }
          console.groupEnd();
          return false;
        }
      }
      console.log("[OLIVO:cart:validate] ✅ Carrito válido, sin cambios");
      console.groupEnd();
      return true;
    } catch (error) {
      console.error("[OLIVO:cart:validate] ❌ Error de red:", error);
      console.groupEnd();
      return true;
    } finally {
      setIsSyncing(false);
    }
  }, [cartItems, showToast]);

  const contextValue = useMemo<CartContextType>(() => ({
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
  }), [cartItems, addToCart, removeFromCart, updateQuantity, clearCart, validateCartWithServer, subtotal, total, itemCount, isSyncing]);  

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
