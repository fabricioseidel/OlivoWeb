"use client";

import React, { useMemo } from "react";
import { useParams } from "next/navigation";
import { useProducts } from "@/contexts/ProductContext";
import ImageWithFallback from '@/components/ui/ImageWithFallback';

export default function CategoryDetailPage() {
  const { categoria } = useParams() as { categoria: string };
  const { products, loading, error } = useProducts();

  const target = decodeURIComponent(categoria || "").toLowerCase();

  const filtered = useMemo(() => {
    return products.filter((p) =>
      (p.categories || []).some((c) => c.toLowerCase() === target)
    );
  }, [products, target]);

  if (loading) return <div className="p-6">Cargando productos…</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>;
  if (!filtered.length)
    return (
      <div className="p-6">
        No hay productos en la categoría <strong>{decodeURIComponent(categoria)}</strong>.
      </div>
    );

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">
        Categoría: {decodeURIComponent(categoria)}
      </h1>

      <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(220px,1fr))]">
        {filtered.map((p) => (
          <div key={p.id} className="border rounded p-4">
            <div className="mb-2 aspect-[4/3] overflow-hidden rounded bg-gray-100">
              {/* Si ya usas <Image />, puedes cambiarlo; así es simple */}
              <ImageWithFallback
                src={(p as any).image_url || (p as any).image || "/vercel.svg"}
                alt={p.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="font-medium">{p.name}</div>
            <div className="text-sm text-gray-600">Stock: {p.stock ?? 0}</div>
            <div className="mt-1 font-semibold">
              ${Number(p.price ?? 0).toLocaleString("es-CL")}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
