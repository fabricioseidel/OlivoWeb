"use client";

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { ShoppingCart, Plus, Minus, Tag, Trash2 } from 'lucide-react';
import ImageWithFallback from "@/components/ui/ImageWithFallback";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/contexts/ToastContext";

import { ProductUI } from '@/types';

type Props = { product: ProductUI };

export default function ProductCard({ product }: Props) {
  const { addToCart, cartItems, removeFromCart } = useCart();
  const { showToast } = useToast();
  const [isAdding, setIsAdding] = useState(false);

  // Check if item is in cart and get its quantity
  const cartItem = useMemo(() => cartItems.find(item => item.id === product.id), [cartItems, product.id]);
  const quantityInCart = cartItem?.quantity || 0;

  // Calculate effective price
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

  const handleAddOne = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsAdding(true);
    addToCart({
      id: product.id,
      name: product.name,
      price: effectivePrice,
      image: product.image || "/file.svg",
      slug: product.slug,
    }, 1);

    if (quantityInCart === 0) {
      showToast(`${product.name} añadido`, 'success');
    }

    setTimeout(() => setIsAdding(false), 300);
  };

  const handleRemoveOne = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (quantityInCart > 1) {
      addToCart({
        id: product.id,
        name: product.name,
        price: effectivePrice,
        image: product.image || "/file.svg",
        slug: product.slug,
      }, -1);
    } else if (quantityInCart === 1) {
      removeFromCart(product.id);
      showToast(`${product.name} eliminado`, 'info');
    }
  };

  return (
    <div className="group relative h-full flex flex-col rounded-[2rem] bg-white shadow-sm ring-1 ring-gray-100 hover:shadow-2xl hover:ring-emerald-500/10 transition-all duration-500 overflow-hidden">
      <Link href={`/productos/${product.slug}`} className="block relative aspect-square overflow-hidden bg-gray-50">
        <ImageWithFallback
          src={product.image ?? '/file.svg'}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 origin-center"
          fallback="/file.svg"
        />

        {/* Badges */}
        <div className="absolute top-3 inset-x-3 flex justify-between items-start pointer-events-none">
          <div className="flex flex-col gap-1.5">
            {product.featured && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black tracking-widest uppercase bg-emerald-600/90 backdrop-blur-md text-white shadow-lg ring-1 ring-white/20">
                TOP
              </span>
            )}
            {hasDiscount && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black tracking-widest uppercase bg-red-600/90 backdrop-blur-md text-white shadow-lg ring-1 ring-white/20">
                -{discountPercent}%
              </span>
            )}
          </div>
        </div>

        {/* Stock Badge */}
        {product.stock !== undefined && product.stock < 10 && (
          <div className="absolute bottom-3 left-3 pointer-events-none">
            <span className={`px-2.5 py-1 rounded-lg text-[9px] uppercase tracking-widest font-black shadow-lg backdrop-blur-md border ${product.stock === 0
              ? 'bg-gray-900/80 text-white border-white/10'
              : 'bg-amber-500/90 text-white border-white/10'
              }`}>
              {product.stock === 0 ? 'AGOTADO' : `Últimos ${product.stock}`}
            </span>
          </div>
        )}
      </Link>

      <div className="flex flex-col flex-1 p-3 sm:p-5">
        {product.categories && product.categories.length > 0 && (
          <p className="text-[9px] font-black text-emerald-600/60 uppercase tracking-[0.2em] mb-1">
            {product.categories[0]}
          </p>
        )}

        <Link href={`/productos/${product.slug}`} className="group-hover:text-emerald-600 transition-colors">
          <h3 className="text-sm sm:text-base font-bold text-gray-900 line-clamp-2 leading-snug min-h-[2.4rem] sm:min-h-[2.8rem]">
            {product.name}
          </h3>
        </Link>

        <div className="mt-auto pt-3 flex items-center justify-between">
          <div className="flex flex-col">
            {hasDiscount ? (
              <>
                <span className="text-[10px] text-gray-400 font-bold line-through ml-0.5">
                  {formatCurrency(basePrice)}
                </span>
                <span className="text-base sm:text-xl font-black text-gray-900 leading-none tracking-tight">
                  {formatCurrency(effectivePrice)}
                </span>
              </>
            ) : (
              <span className="text-base sm:text-xl font-black text-gray-900 leading-none h-[1.25rem] sm:h-[1.5rem] flex items-end tracking-tight">
                {formatCurrency(basePrice)}
              </span>
            )}
          </div>

          {quantityInCart > 0 ? (
            <div className="flex items-center bg-gray-50 rounded-2xl p-1 border border-gray-100 shadow-inner">
              <button
                onClick={handleRemoveOne}
                className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl text-gray-400 hover:text-red-500 hover:bg-white transition-all shadow-sm active:scale-90"
              >
                {quantityInCart === 1 ? <Trash2 className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
              </button>
              <span className="w-8 text-center text-sm font-black text-gray-900">{quantityInCart}</span>
              <button
                onClick={handleAddOne}
                disabled={product.stock !== undefined && quantityInCart >= product.stock}
                className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 transition-all shadow-md active:scale-90 disabled:bg-gray-200 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" strokeWidth={3} />
              </button>
            </div>
          ) : (
            <button
              onClick={handleAddOne}
              disabled={isAdding || product.stock === 0}
              className={`flex items-center justify-center p-2.5 rounded-2xl transition-all duration-300 min-h-[44px] min-w-[44px] ${isAdding
                ? 'bg-emerald-100 text-emerald-600 scale-110'
                : product.stock === 0
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed grayscale'
                  : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-500/20 active:scale-90'
                }`}
            >
              <Plus strokeWidth={3} className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
