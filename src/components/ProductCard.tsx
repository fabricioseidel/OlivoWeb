"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { ShoppingCart, Plus, Minus, Tag } from 'lucide-react';
import ImageWithFallback from "@/components/ui/ImageWithFallback";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/contexts/ToastContext";

export type ProductUI = {
  id: string;
  name: string;
  slug: string;
  price: number;
  sale_price?: number | null;
  image?: string | null;
  category?: { name: string } | null;
  featured?: boolean;
  stock: number; // made mandatory based on usage, or optional if strictly following spec
};

type Props = { product: ProductUI };

export default function ProductCard({ product }: Props) {
  const { addToCart } = useCart();
  const { showToast } = useToast();
  const [qty, setQty] = useState(1);
  const [isAdding, setIsAdding] = useState(false);

  const price = product.sale_price ?? product.price;
  const hasDiscount = product.sale_price && product.sale_price < product.price;
  const discountPercent = hasDiscount
    ? Math.round(((product.price - product.sale_price!) / product.price) * 100)
    : 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
    }).format(value);
  };

  const handleAdd = async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent link navigation if inside a Link
    setIsAdding(true);
    addToCart({
      id: product.id,
      name: product.name,
      price: price || 0,
      image: product.image || '/file.svg', // adapter for CartItem
      slug: product.slug,
    }, qty);

    showToast(`¡${product.name} añadido al carrito!`, 'success');

    setTimeout(() => setIsAdding(false), 600);
  };

  return (
    <div className="group relative h-full flex flex-col rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 hover:shadow-xl hover:ring-primary/40 transition-all duration-300">
      <Link href={`/productos/${product.slug}`} className="block relative aspect-square rounded-t-2xl overflow-hidden bg-gray-50">
        <ImageWithFallback
          src={product.image ?? '/file.svg'}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          fallback="/file.svg"
        />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {product.featured && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-accent text-white shadow-lg">
              ⭐ Destacado
            </span>
          )}
          {hasDiscount && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-600 text-white shadow-lg">
              <Tag className="size-3" />
              -{discountPercent}%
            </span>
          )}
        </div>

        {/* Stock Badge */}
        {product.stock !== undefined && product.stock < 10 && (
          <div className="absolute bottom-3 right-3">
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold shadow-lg ${product.stock === 0
              ? 'bg-red-600 text-white'
              : 'bg-amber-500 text-white'
              }`}>
              {product.stock === 0 ? 'Agotado' : `Solo ${product.stock}`}
            </span>
          </div>
        )}
      </Link>

      {/* Content */}
      <div className="flex flex-col flex-1 p-4 gap-2">
        {/* Category */}
        {product.category?.name && (
          <p className="text-xs font-medium text-primary uppercase tracking-wide">
            {product.category.name}
          </p>
        )}

        {/* Product Name */}
        <Link href={`/productos/${product.slug}`} className="hover:text-primary transition-colors">
          <h3 className="text-base font-semibold text-gray-900 line-clamp-2 min-h-[3rem]">
            {product.name}
          </h3>
        </Link>

        {/* Price */}
        <div className="mt-auto pt-2">
          {hasDiscount ? (
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-primary">
                {formatCurrency(product.sale_price!)}
              </span>
              <span className="text-sm text-gray-400 line-through">
                {formatCurrency(product.price)}
              </span>
            </div>
          ) : (
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(product.price)}
            </div>
          )}
        </div>
      </div>

      {/* Footer - Add to Cart */}
      <div className="p-4 pt-0 flex items-center gap-2">
        {/* Quantity Selector */}
        <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50">
          <button
            onClick={() => setQty(Math.max(1, qty - 1))}
            className="p-2 hover:bg-gray-100 transition-colors rounded-l-lg"
            aria-label="Disminuir cantidad"
          >
            <Minus className="size-4 text-gray-600" />
          </button>
          <span className="px-3 py-2 min-w-[2.5rem] text-center font-semibold text-gray-900">
            {qty}
          </span>
          <button
            onClick={() => setQty(qty + 1)}
            className="p-2 hover:bg-gray-100 transition-colors rounded-r-lg"
            aria-label="Aumentar cantidad"
          >
            <Plus className="size-4 text-gray-600" />
          </button>
        </div>

        {/* Add to Cart Button */}
        <button
          onClick={handleAdd}
          disabled={isAdding || product.stock === 0}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold transition-all duration-300 ${isAdding
            ? 'bg-green-600 text-white scale-95'
            : product.stock === 0
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-primary text-white hover:bg-emerald-700 hover:shadow-lg active:scale-95'
            }`}
        >
          {isAdding ? (
            <>
              <span className="animate-bounce">✓</span>
              <span>Añadido</span>
            </>
          ) : (
            <>
              <ShoppingCart className="size-4" />
              <span>Añadir</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
