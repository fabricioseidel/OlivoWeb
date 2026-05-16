"use client";

import { useState, useCallback } from "react";
import { ProductUI } from "@/types";
import { searchProducts } from "@/services/products";
import { createReceptionAction } from "@/actions/reception";
import { useBranch } from "@/contexts/BranchContext";

export interface InventoryItem {
  product: ProductUI;
  quantity: number;
}

export type InventoryMode = "SALE" | "PURCHASE";

/**
 * Manage a queue of scanned items + confirm them as a real DB operation.
 * - PURCHASE: inserts inventory_movements (IN) and increments branch_stock
 *   via apply_reception RPC.
 * - SALE: deprecated path — sales should go through /admin/pos which uses
 *   createSaleAction (full sales + sale_items + sale_payments).
 */
export function useQuickInventory(mode: InventoryMode) {
  const { currentBranch } = useBranch();
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
      const existingIndex = items.findIndex(
        (item) => item.product.barcode === barcode || item.product.id === barcode
      );

      if (existingIndex >= 0) {
        const next = [...items];
        next[existingIndex].quantity += 1;
        setItems(next);
        return true;
      }

      const results = await searchProducts(barcode);
      const found = results.find((p) => p.barcode === barcode || p.id === barcode);

      if (!found) {
        setError(`Producto no encontrado: ${barcode}`);
        return false;
      }

      setItems((prev) => [...prev, { product: found, quantity: 1 }]);
      return true;
    } catch {
      setError("Error al buscar el producto");
      return false;
    } finally {
      setIsScanning(false);
    }
  }, [items]);

  const updateQuantity = useCallback((barcode: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) =>
        prev.filter((i) => i.product.barcode !== barcode && i.product.id !== barcode)
      );
      return;
    }
    setItems((prev) =>
      prev.map((i) =>
        i.product.barcode === barcode || i.product.id === barcode
          ? { ...i, quantity }
          : i
      )
    );
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
      if (mode === "PURCHASE") {
        const result = await createReceptionAction({
          items: items.map((i) => ({
            barcode: i.product.barcode || i.product.id,
            qty: i.quantity,
            name: i.product.name,
          })),
          branchId: currentBranch?.id ?? null,
          notes: "RECEPTION",
        });

        if (!result.ok) throw new Error(result.error);
        setSuccess(`Recepción registrada: ${result.count} producto${result.count === 1 ? "" : "s"}`);
      } else {
        // SALE: deprecated path. Surface a clear error so the operator uses /admin/pos
        throw new Error("Las ventas rápidas se procesan ahora desde el Punto de Venta. Usa /admin/operaciones (modo Venta).");
      }

      setItems([]);
    } catch (err: any) {
      setError(err?.message || "Error al procesar la operación");
    } finally {
      setIsSaving(false);
    }
  }, [items, mode, currentBranch?.id]);

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
    totalItems: items.reduce((acc, item) => acc + item.quantity, 0),
  };
}
