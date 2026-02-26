"use client";

import React from "react";
import ProductCard from "@/components/ProductCard";
import { ProductUI } from "@/types";
import SkeletonCard from "../components/ui/SkeletonCard";

type Props = {
  products?: ProductUI[];
  loading?: boolean;
  emptyMessage?: string;
};

export default function ProductGrid({ products = [], loading, emptyMessage = "No hay productos" }: Props) {
  const showSkeletons = loading && (!products || products.length === 0);
  const list = products || [];

  return (
    <div>
      {showSkeletons ? (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="text-center py-16 text-gray-500">{emptyMessage}</div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-5">
          {list.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
