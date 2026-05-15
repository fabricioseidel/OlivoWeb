"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { ProductUI } from "@/types";

interface POSItem extends ProductUI {
  quantity: number;
}

interface POSContextType {
  cart: POSItem[];
  addToCart: (product: ProductUI, quantity?: number) => void;
  removeFromCart: (barcode: string) => void;
  updateQuantity: (barcode: string, quantity: number) => void;
  clearCart: () => void;
  total: number;
  itemCount: number;
  isScanning: boolean;
  lastScannedBarcode: string | null;
  discount: number;
  appliedCoupon: string | null;
  setAppliedCoupon: (code: string | null) => void;
  applyDiscount: (amount: number) => void;
  finalTotal: number;
}

const POSContext = createContext<POSContextType | undefined>(undefined);

export function POSProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<POSItem[]>([]);
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [discount, setDiscount] = useState<number>(0);
  const isScanning = false;
  const lastScannedBarcode: string | null = null;

  const total = cart.reduce((acc, item) => acc + (item.offerPrice || item.price) * item.quantity, 0);
  const finalTotal = Math.max(0, total - discount);
  const itemCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  const applyDiscount = useCallback((amount: number) => setDiscount(amount), []);

  const addToCart = useCallback((product: ProductUI, quantity: number = 1) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item);
      }
      return [...prev, { ...product, quantity }];
    });
  }, []);

  const removeFromCart = useCallback((barcode: string) => {
    setCart(prev => prev.filter(item => item.id !== barcode));
  }, []);

  const updateQuantity = useCallback((barcode: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(barcode);
      return;
    }
    setCart(prev => prev.map(item => item.id === barcode ? { ...item, quantity } : item));
  }, [removeFromCart]);

  const clearCart = useCallback(() => {
    setCart([]);
    setAppliedCoupon(null);
    setDiscount(0);
  }, []);

  return (
    <POSContext.Provider value={{
      cart,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      total,
      itemCount,
      isScanning,
      lastScannedBarcode,
      discount,
      appliedCoupon,
      setAppliedCoupon,
      applyDiscount,
      finalTotal
    }}>
      {children}
    </POSContext.Provider>
  );
}

export const usePOS = () => {
  const context = useContext(POSContext);
  if (!context) throw new Error("usePOS must be used within POSProvider");
  return context;
};
