"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { ShoppingCart, Plus, Minus, Tag } from 'lucide-react';
import ImageWithFallback from "@/components/ui/ImageWithFallback";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/contexts/ToastContext";

import { ProductUI } from '@/types';

type Props = { product: ProductUI };

export default function ProductCard({ product }: Props) {
  const { addToCart } = useCart();
  const { showToast } = useToast();
  const [qty, setQty] = useState(1);
  const [isAdding, setIsAdding] = useState(false);

  // Calculate effective price (lowest between base price and offer price)
  const basePrice = product.price;
  const offerPrice = product.offerPrice;
  const hasDiscount = !!(offerPrice && offerPrice > 0 && offerPrice < basePrice);
  const effectivePrice = hasDiscount ? offerPrice : basePrice;

  const discountPercent = hasDiscount
    ? Math.round(((basePrice - offerPrice!) / basePrice) * 100)
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
      price: effectivePrice,
      image: product.image || "/file.svg", // adapter for CartItem
      slug: product.slug,
    }, qty);

    showToast(`¡${product.name} añadido al carrito!`, 'success');

    setTimeout(() => setIsAdding(false), 600);
  };

  return (
    <div className="group relative h-full flex flex-col rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 hover:shadow-xl hover:ring-emerald-500/10 transition-all duration-300">
      <Link href={`/productos/${product.slug}`} className="block relative aspect-square overflow-hidden bg-gray-50 rounded-t-2xl">
        <ImageWithFallback
          src={product.image ?? '/file.svg'}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 origin-center"
          fallback="/file.svg"
        />

        {/* Badges */}
        <div className="absolute top-3 inset-x-3 flex justify-between items-start">
          <div className="flex flex-col gap-1.5">
            {product.featured && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-500/20">
                Destacado
              </span>
            )}
            {hasDiscount && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase bg-red-600 text-white shadow-sm ring-1 ring-red-500/20">
                -{discountPercent}%
              </span>
            )}
          </div>
        </div>

        {/* Stock Badge overlay */}
        {product.stock !== undefined && product.stock < 10 && (
          <div className="absolute bottom-3 left-3">
            <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wide font-bold shadow-sm ${product.stock === 0
              ? 'bg-gray-900 text-white'
              : 'bg-amber-100 text-amber-800 ring-1 ring-amber-200'
              }`}>
              {product.stock === 0 ? 'Agotado' : `Últimos ${product.stock}`}
            </span>
          </div>
        )}
      </Link>

      {/* Content */}
      <div className="flex flex-col flex-1 p-4">
        {/* Category */}
        {product.categories && product.categories.length > 0 && (
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
            {product.categories[0]}
          </p>
        )}

        {/* Product Name */}
        <Link href={`/productos/${product.slug}`} className="hover:text-emerald-600 transition-colors">
          <h3 className="text-sm sm:text-base font-medium text-gray-900 line-clamp-2 leading-tight min-h-[2.5rem] sm:min-h-[2.75rem]">
            {product.name}
          </h3>
        </Link>

        {/* Pricing Layout App-like */}
        <div className="mt-auto pt-3 flex items-center justify-between">
          <div className="flex flex-col">
            {hasDiscount ? (
              <>
                <span className="text-xs text-gray-400 font-medium line-through">
                  {formatCurrency(basePrice)}
                </span>
                <span className="text-lg font-bold text-gray-900 leading-none">
                  {formatCurrency(effectivePrice)}
                </span>
              </>
            ) : (
              <span className="text-lg font-bold text-gray-900 leading-none h-[1.75rem] flex items-end">
                {formatCurrency(basePrice)}
              </span>
            )}
          </div>

          <button
            onClick={handleAdd}
            disabled={isAdding || product.stock === 0}
            className={`flex items-center justify-center p-3 rounded-xl transition-all min-h-[44px] min-w-[44px] ${isAdding
                ? 'bg-emerald-100 text-emerald-600'
                : product.stock === 0
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-md active:scale-95'
              }`}
            aria-label="Añadir al carrito"
          >
            {isAdding ? (
              <span className="font-bold text-sm">✓</span>
            ) : (
              <Plus strokeWidth={2.5} className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
