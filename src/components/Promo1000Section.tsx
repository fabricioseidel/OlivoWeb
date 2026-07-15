"use client";

import Link from "next/link";
import { Sparkles, ChevronRight } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import type { ProductUI } from "@/types";

type Props = {
  title: string;
  products: ProductUI[];
  loading: boolean;
  href?: string;
};

// Sección "Todo a $1.000": mismo patrón visual que las demás grillas de
// productos de la home, pero alimentada por el flag `promo1000` (curado a
// mano), independiente de `featured` ("Lo Más Vendido").
export default function Promo1000Section({ title, products, loading, href = "/productos" }: Props) {
  if (!loading && products.length === 0) return null;

  return (
    <section className="py-8 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <h2 className="text-xl font-black text-gray-900">{title}</h2>
          </div>
          <Link href={href} className="text-sm font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
            Ver todos <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {loading
            ? Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="h-64 bg-gray-100 animate-pulse rounded-2xl" />
              ))
            : products.map(product => (
                <ProductCard
                  key={product.id}
                  product={{ ...product, slug: product.slug || product.id, categories: product.categories || [] } as any}
                />
              ))
          }
        </div>
      </div>
    </section>
  );
}
