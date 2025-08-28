"use client";
import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { fetchAllCategories, upsertCategory, deleteCategory } from "@/services/categories";

type CategoryContextType = {
  categories: string[];
  loading: boolean;
  error?: string;
  refresh: () => Promise<void>;
  createCategory: (name: string) => Promise<void>;
  removeCategory: (name: string) => Promise<void>;
};

const CategoryContext = createContext<CategoryContextType | undefined>(undefined);

export function CategoryProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(undefined);
      const data = await fetchAllCategories();
      setCategories(data);
    } catch (e: any) {
      setError(e?.message || "No se pudieron cargar las categorías");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const refresh = async () => { await load(); };

  const createCategory = async (name: string) => {
    await upsertCategory(name);
    await load();
  };

  const removeCategory = async (name: string) => {
    await deleteCategory(name);
    await load();
  };

  return (
    <CategoryContext.Provider value={{ categories, loading, error, refresh, createCategory, removeCategory }}>
      {children}
    </CategoryContext.Provider>
  );
}

export function useCategories() {
  const ctx = useContext(CategoryContext);
  if (!ctx) throw new Error("useCategories debe usarse dentro de CategoryProvider");
  return ctx;
}
