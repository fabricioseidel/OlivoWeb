"use client";

import { useState, useEffect, useCallback } from "react";
import { ProductUI } from "@/types";
import { searchProducts } from "@/services/products";

export interface InventoryItem {
  product: ProductUI;
  quantity: number;
}

export type InventoryMode = "SALE" | "PURCHASE";

export function useQuickInventory(mode: InventoryMode) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const addItem = useCallback(async (barcode: string) => {
    setIsScanning(true);
    setError(null);
    setSuccess(null);

    try {
      // Check if already in list
      const existingIndex = items.findIndex(item => item.product.barcode === barcode || item.product.id === barcode);
      
      if (existingIndex >= 0) {
        const newItems = [...items];
        newItems[existingIndex].quantity += 1;
        setItems(newItems);
        setIsScanning(false);
        return true;
      }

      // Search product
      const results = await searchProducts(barcode);
      const found = results.find(p => p.barcode === barcode || p.id === barcode);

      if (found) {
        setItems(prev => [...prev, { product: found, quantity: 1 }]);
        setIsScanning(false);
        return true;
      } else {
        // Even if not found, we could allow adding a "placeholder" but user 
        // specifically said "lo que va a hacer es anotar el producto escaneado"
        // and "aunque aun no hayan imagenes y precios el inventario no se desactualizara".
        // This implies the product MUST exist in the DB (even with minimal info).
        // If not found, we show an error.
        setError(`Producto no encontrado: ${barcode}`);
        setIsScanning(false);
        return false;
      }
    } catch (err: any) {
      setError("Error al buscar el producto");
      setIsScanning(false);
      return false;
    }
  }, [items]);

  const updateQuantity = useCallback((barcode: string, quantity: number) => {
    if (quantity <= 0) {
      setItems(prev => prev.filter(item => item.product.barcode !== barcode && item.product.id !== barcode));
      return;
    }
    setItems(prev => prev.map(item => 
      (item.product.barcode === barcode || item.product.id === barcode) 
        ? { ...item, quantity } 
        : item
    ));
  }, []);

  const clear = useCallback(() => {
    setItems([]);
    setError(null);
    setSuccess(null);
  }, []);

  const confirm = useCallback(async () => {
    if (items.length === 0) return;
    setIsSaving(true);
    setError(null);

    try {
      const payloads = items.map(item => {
        const currentStock = item.product.stock || 0;
        const newStock = mode === "SALE" 
          ? currentStock - item.quantity 
          : currentStock + item.quantity;
        
        return {
          barcode: item.product.barcode || item.product.id,
          stock: newStock,
          updated_at: new Date().toISOString()
        };
      });

      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: payloads })
      });

      if (!res.ok) throw new Error("Error al actualizar inventario");

      setSuccess(mode === "SALE" ? "Venta registrada con éxito" : "Compra registrada con éxito");
      setItems([]);
    } catch (err: any) {
      setError(err.message || "Error al procesar la operación");
    } finally {
      setIsSaving(false);
    }
  }, [items, mode]);

  // Global Keyboard Listener removed to avoid conflicts with ScanSelector input

  return {
    items,
    addItem,
    updateQuantity,
    confirm,
    clear,
    isScanning,
    isSaving,
    error,
    success,
    totalItems: items.reduce((acc, item) => acc + item.quantity, 0)
  };
}
