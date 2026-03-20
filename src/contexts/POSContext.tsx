"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { ProductUI } from "@/types";
import { searchProducts } from "@/services/products";

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
  const [isScanning, setIsScanning] = useState(false);
  const [lastScannedBarcode, setLastScannedBarcode] = useState<string | null>(null);

  // Buffer for barcode scanner input (which behaves like a keyboard)
  const [scanBuffer, setScanBuffer] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [discount, setDiscount] = useState<number>(0);

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

  // Global Key Listener for physical barcode scanners
  useEffect(() => {
    let timeout: NodeJS.Timeout;

    const handleKeyDown = async (e: KeyboardEvent) => {
      // Ignore if typing in an input field (unless it's the scanning mode)
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === "Enter") {
        if (scanBuffer.length > 3) {
          setIsScanning(true);
          try {
            // Check if it's a coupon format (heuristic: contains 'CUPON' or 'DESC')
            if (scanBuffer.toUpperCase().includes("CUPON") || scanBuffer.toUpperCase().includes("DESC") || scanBuffer.length > 15) {
              const res = await fetch(`/api/coupons/validate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: scanBuffer, cartTotal: total })
              });
              if (res.ok) {
                const data = await res.json();
                if (data.isValid && data.coupon) {
                   setAppliedCoupon(data.coupon.code);
                   setDiscount(data.discountAmount || 0);
                   setIsScanning(false);
                   setScanBuffer("");
                   return; // Stop here if coupon applied
                }
              }
            }

            // Otherwise, it's a product
            const results = await searchProducts(scanBuffer);
            const found = results.find(p => p.id === scanBuffer);
            if (found) {
              setCart(prev => {
                const existing = prev.find(item => item.id === found.id);
                if (existing) {
                  return prev.map(item => item.id === found.id ? { ...item, quantity: item.quantity + 1 } : item);
                }
                return [...prev, { ...found, quantity: 1 }];
              });
              setLastScannedBarcode(scanBuffer);
            }
          } catch (err) {
            console.error("Scan error", err);
          } finally {
            setIsScanning(false);
            setScanBuffer("");
          }
        }
      } else if (e.key.length === 1) {
        setScanBuffer(prev => prev + e.key);
        
        // Clear buffer if no input for 200ms (typical of human typing vs scanner)
        clearTimeout(timeout);
        timeout = setTimeout(() => setScanBuffer(""), 200);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(timeout);
    };
  }, [scanBuffer, addToCart]);

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
