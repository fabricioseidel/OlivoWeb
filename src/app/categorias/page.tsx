"use client";

import React from "react";
import Link from "next/link";
import { useCategories } from "@/contexts/CategoryContext";

export default function CategoriesPage() {
  const { categories, loading, error } = useCategories();

  if (loading) return <div className="p-6">Cargando categorías…</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>;
  if (!categories.length) return <div className="p-6">No se encontraron categorías.</div>;

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Categorías</h1>
      <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(180px,1fr))]">
        {categories.map((c) => (
          <Link
            key={c}
            href={`/categorias/${encodeURIComponent(c)}`}
            className="border rounded p-4 hover:bg-gray-50"
          >
            {c}
          </Link>
        ))}
      </div>
    </div>
  );
}
