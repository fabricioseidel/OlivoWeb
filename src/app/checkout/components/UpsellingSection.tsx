"use client";

import React, { useMemo } from "react";
import Image from "next/image";
import { useCart } from "@/contexts/CartContext";
import { useProducts } from "@/contexts/ProductContext";
import { PlusIcon, SparklesIcon } from "@heroicons/react/24/outline";

export default function UpsellingSection() {
  const { cartItems, addToCart } = useCart();
  const { products } = useProducts();

  const recommendations = useMemo(() => {
    if (!products.length) return [];

    // Get IDs of items already in cart
    const cartItemIds = new Set(cartItems.map((item) => item.id));

    // Determine the categories of items in the cart
    const cartCategories = new Set<string>();
    cartItems.forEach(item => {
       const product = products.find(p => p.id === item.id);
       if (product?.categories) {
           product.categories.forEach(c => cartCategories.add(c));
       }
    });

    // Score products
    const scoredProducts = products
      .filter((p) => !cartItemIds.has(p.id) && p.stock > 0)
      .map((p) => {
        let score = p.viewCount || 0;
        let matchCategories = 0;
        if (p.categories) {
            p.categories.forEach(c => {
                if (cartCategories.has(c)) { matchCategories++; score += 50; }
            });
        }
        return { product: p, score };
      });

    // Sort by score
    scoredProducts.sort((a, b) => b.score - a.score);

    // Return the top 2
    return scoredProducts.slice(0, 2).map((sp) => sp.product);
  }, [cartItems, products]);

  if (recommendations.length === 0) return null;

  return (
    <div className="mt-8 pt-8 border-t border-gray-100">
      <h4 className="text-[11px] font-black uppercase tracking-widest text-emerald-600 mb-4 flex items-center gap-2">
        <SparklesIcon className="h-4 w-4" /> Frecuentemente comprados juntos
      </h4>
      <div className="space-y-3">
        {recommendations.map((product) => {
           const price = product.offerPrice || product.price;
           return (
             <div key={product.id} className="group relative flex items-center gap-3 p-3 rounded-2xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:shadow-lg hover:shadow-emerald-900/5 transition-all">
                <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-white shadow-sm shrink-0">
                  <Image src={product.image || "/images/placeholder.jpg"} alt={product.name} fill className="object-cover group-hover:scale-110 transition-transform duration-500" sizes="60px" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-gray-900 truncate pr-2">{product.name}</p>
                  <p className="text-sm font-black text-emerald-600">${price.toLocaleString('es-CL')}</p>
                </div>
                <button
                  onClick={() => addToCart({
                      id: product.id,
                      name: product.name,
                      price: product.offerPrice || product.price,
                      image: product.image || '',
                      slug: product.id // Fallback if slug missing
                  }, 1)}
                  className="shrink-0 h-8 w-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all active:scale-95"
                  title="Añadir al carrito"
                >
                  <PlusIcon className="h-4 w-4" />
                </button>
             </div>
           );
        })}
      </div>
    </div>
  );
}
