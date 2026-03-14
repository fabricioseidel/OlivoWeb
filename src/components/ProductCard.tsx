"use client";

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Plus, Minus, Trash2 } from 'lucide-react';
import ImageWithFallback from "@/components/ui/ImageWithFallback";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/contexts/ToastContext";

import { getCategoryStyle } from '@/utils/categoryStyles';

import { ProductUI } from '@/types';

type Props = { product: ProductUI };

export default function ProductCard({ product }: Props) {
  const { addToCart, cartItems, removeFromCart } = useCart();
  const { showToast } = useToast();
  const [isAdding, setIsAdding] = useState(false);

  // Obtener estilo de la categoría para el fallback de imagen
  const categoryName = (product.categories && product.categories.length > 0) ? product.categories[0] : 'General';
  const categoryStyle = getCategoryStyle(categoryName);
  const CategoryIcon = categoryStyle.icon;

  const [imgError, setImgError] = useState(false);

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
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
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

  // Determinar si tenemos una imagen válida (que no sea el placeholder antiguo)
  const hasValidImage = product.image && 
                       product.image !== '/file.svg' && 
                       product.image.trim() !== '' && 
                       !imgError;

  return (
    <div className="group relative h-full flex flex-col rounded-[2.5rem] bg-white border border-gray-100/50 hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] hover:-translate-y-2 hover:border-emerald-100 transition-all duration-500 overflow-hidden">
      {/* Contenedor de Imagen Homogéneo */}
      <Link href={`/productos/${product.slug}`} className="block relative aspect-square overflow-hidden bg-gray-50/50 p-6 sm:p-8">
        <div className="relative w-full h-full flex items-center justify-center">
            {hasValidImage ? (
                <ImageWithFallback
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-contain mix-blend-multiply group-hover:scale-110 transition-transform duration-700 pointer-events-none"
                    onError={() => setImgError(true)}
                />
            ) : (
                <div className={`size-20 sm:size-24 rounded-[2rem] ${categoryStyle.bg} flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-700 animate-in fade-in zoom-in duration-500`}>
                    <CategoryIcon className={`size-10 sm:size-12 ${categoryStyle.color} opacity-60 group-hover:opacity-100 transition-opacity`} />
                </div>
            )}
        </div>

        {/* Badges Flotantes - Simplificados y Elegantes */}
        <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none z-10">
          {product.featured && (
            <div className="px-3 py-1 bg-emerald-600/90 backdrop-blur-md text-white text-[9px] font-black tracking-tighter rounded-lg shadow-lg shadow-emerald-900/10 uppercase ring-1 ring-white/20">
              Popular
            </div>
          )}
          {hasDiscount && (
            <div className="px-3 py-1 bg-red-500/90 backdrop-blur-md text-white text-[9px] font-black tracking-tighter rounded-lg shadow-lg shadow-red-900/10 uppercase ring-1 ring-white/20">
              {discountPercent}% OFF
            </div>
          )}
        </div>

        {/* Stock / Estado Badge */}
        {product.stock !== undefined && product.stock <= 5 && (
          <div className="absolute bottom-4 left-4 pointer-events-none z-10">
            <span className={`px-2.5 py-1 rounded-lg text-[8px] sm:text-[9px] uppercase tracking-widest font-black shadow-lg backdrop-blur-md border ${product.stock === 0
              ? 'bg-gray-900/90 text-white border-white/10'
              : 'bg-amber-400/90 text-white border-white/10'
              }`}>
              {product.stock === 0 ? 'AGOTADO' : `¡Últimas ${product.stock}!`}
            </span>
          </div>
        )}
      </Link>

      <div className="flex flex-col flex-1 p-5 sm:p-6 bg-white">
        {/* Categoría con estilo minimalista */}
        {product.categories && product.categories.length > 0 && (
          <div className="flex items-center gap-2 mb-2">
            <div className="size-1.5 rounded-full bg-emerald-400" />
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                {product.categories[0]}
            </p>
          </div>
        )}

        <Link href={`/productos/${product.slug}`} className="mb-4">
          <h3 className="text-sm sm:text-base font-bold text-gray-900 line-clamp-2 leading-[1.3] group-hover:text-emerald-600 transition-colors">
            {product.name}
          </h3>
        </Link>

        {/* Precio y Botón en un bloque balanceado */}
        <div className="mt-auto pt-4 flex items-end justify-between border-t border-gray-50">
          <div className="flex flex-col">
            {hasDiscount ? (
              <>
                <span className="text-[10px] sm:text-xs text-gray-400 font-bold line-through mb-0.5">
                  {formatCurrency(basePrice)}
                </span>
                <span className="text-lg sm:text-2xl font-black text-emerald-950 leading-none tracking-tighter">
                  {formatCurrency(effectivePrice)}
                </span>
              </>
            ) : (
              <span className="text-lg sm:text-2xl font-black text-emerald-950 leading-none tracking-tighter mb-1">
                {formatCurrency(basePrice)}
              </span>
            )}
          </div>

          <div className="relative">
            {quantityInCart > 0 ? (
                <div className="flex items-center bg-gray-50 rounded-2xl p-1 border border-gray-100 shadow-sm animate-in scale-in">
                    <button
                        onClick={handleRemoveOne}
                        className="size-8 sm:size-10 flex items-center justify-center rounded-xl text-gray-400 hover:text-red-500 hover:bg-white transition-all active:scale-90"
                    >
                        {quantityInCart === 1 ? <Trash2 className="size-4" /> : <Minus className="size-4" />}
                    </button>
                    <span className="w-8 text-center text-sm font-black text-gray-950">{quantityInCart}</span>
                    <button
                        onClick={handleAddOne}
                        disabled={product.stock !== undefined && quantityInCart >= product.stock}
                        className="size-8 sm:size-10 flex items-center justify-center rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 transition-all shadow-md active:scale-90 disabled:opacity-50"
                    >
                        <Plus className="size-4" strokeWidth={3} />
                    </button>
                </div>
            ) : (
                <button
                onClick={handleAddOne}
                disabled={isAdding || product.stock === 0}
                className={`flex items-center justify-center size-10 sm:size-12 rounded-2xl transition-all duration-300 ${isAdding
                    ? 'bg-emerald-50 text-emerald-600 scale-110'
                    : product.stock === 0
                    ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700 hover:rotate-90 shadow-[0_10px_20px_-5px_rgba(16,185,129,0.3)]'
                    }`}
                >
                <Plus strokeWidth={3} className="size-5 sm:size-6" />
                </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
