"use client";

import React, { memo, useState, useMemo } from 'react';
import Link from 'next/link';
import { Plus, Minus, Trash2 } from 'lucide-react';
import ImageWithFallback from "@/components/ui/ImageWithFallback";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/contexts/ToastContext";

import { getCategoryStyle } from '@/utils/categoryStyles';

import { ProductUI } from '@/types';
import { formatCLP } from "@/utils/currency";

const formatCurrency = formatCLP;

type Props = { product: ProductUI };

/**
 * Tarjeta de producto.
 *
 * Diseño: la tarjeta se define por su borde y no por una sombra dramática, y
 * el único elemento en peso fuerte es el precio — que es lo que el cliente
 * compara al recorrer la grilla. Cuando el nombre, la categoría, el badge y el
 * precio están todos en `font-black`, la grilla se vuelve ruido plano.
 */
function ProductCard({ product }: Props) {
  const { addToCart, cartItems, removeFromCart, updateQuantity } = useCart();
  const { showToast } = useToast();
  const [isAdding, setIsAdding] = useState(false);

  const categoryName = (product.categories && product.categories.length > 0) ? product.categories[0] : 'General';
  const categoryStyle = getCategoryStyle(categoryName);
  const CategoryIcon = categoryStyle.icon;

  const [imgError, setImgError] = useState(false);

  const cartItem = useMemo(() => cartItems.find(item => item.id === product.id), [cartItems, product.id]);
  const quantityInCart = cartItem?.quantity || 0;

  const basePrice = product.price;
  const offerPrice = product.offerPrice;
  const hasDiscount = !!(offerPrice && offerPrice > 0 && offerPrice < basePrice);
  const effectivePrice = hasDiscount ? offerPrice : basePrice;

  const discountPercent = hasDiscount
    ? Math.round(((basePrice - offerPrice!) / basePrice) * 100)
    : 0;

  const outOfStock = product.stock === 0;
  const lowStock = product.stock !== undefined && product.stock > 0 && product.stock <= 5;

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

    setTimeout(() => setIsAdding(false), 250);
  };

  const handleRemoveOne = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (quantityInCart > 1) {
      updateQuantity(product.id, quantityInCart - 1);
    } else if (quantityInCart === 1) {
      removeFromCart(product.id);
      showToast(`${product.name} eliminado`, 'info');
    }
  };

  const hasValidImage = product.image &&
                       product.image !== '/file.svg' &&
                       product.image.trim() !== '' &&
                       !imgError;

  return (
    <article className="o-card o-card-interactive group relative flex h-full flex-col overflow-hidden">
      <Link
        href={`/productos/${product.slug}`}
        className="o-focus relative block aspect-square overflow-hidden bg-neutral-50 p-5"
      >
        <div className="relative flex h-full w-full items-center justify-center">
          {hasValidImage ? (
            <ImageWithFallback
              src={product.image}
              alt={product.name}
              className="pointer-events-none h-full w-full object-contain transition-transform duration-300 group-hover:scale-[1.04]"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className={`flex size-20 items-center justify-center rounded-2xl ${categoryStyle.bg}`}>
              <CategoryIcon className={`size-9 ${categoryStyle.color} opacity-70`} />
            </div>
          )}
        </div>

        {/* Un solo badge por esquina: dos etiquetas compitiendo no comunican nada. */}
        <div className="pointer-events-none absolute left-3 top-3 flex flex-col items-start gap-1.5">
          {hasDiscount && (
            <span className="rounded-md bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">
              −{discountPercent}%
            </span>
          )}
          {!hasDiscount && product.featured && (
            <span className="rounded-md bg-neutral-900/85 px-2 py-0.5 text-xs font-medium text-white">
              Popular
            </span>
          )}
        </div>

        {(outOfStock || lowStock) && (
          <div className="pointer-events-none absolute bottom-3 left-3">
            <span
              className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                outOfStock ? 'bg-neutral-900/85 text-white' : 'bg-amber-100 text-amber-800'
              }`}
            >
              {outOfStock ? 'Sin stock' : `Quedan ${product.stock}`}
            </span>
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-4">
        {product.categories && product.categories.length > 0 && (
          <p className="mb-1.5 text-xs text-neutral-500">{product.categories[0]}</p>
        )}

        <Link href={`/productos/${product.slug}`} className="o-focus mb-4 block">
          <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug text-neutral-900 transition-colors group-hover:text-brand-700">
            {product.name}
          </h3>
        </Link>

        {/* En la grilla de 2 columnas del móvil la tarjeta mide ~135px de
            contenido, y el selector de cantidad (dos botones + contador) ocupa
            casi todo eso. Puestos en la misma fila que el precio, se salían de
            la tarjeta al agregar un producto. Por eso el precio va arriba y los
            controles debajo, y solo se ponen en fila cuando hay ancho. */}
        <div className="mt-auto flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
          <div className="min-w-0">
            {hasDiscount && (
              <span className="tabular block text-xs text-neutral-400 line-through">
                {formatCurrency(basePrice)}
              </span>
            )}
            <span className="tabular block text-xl font-bold leading-tight text-neutral-900">
              {formatCurrency(effectivePrice)}
            </span>
          </div>

          {quantityInCart > 0 ? (
            <div className="flex w-full shrink-0 items-center justify-between gap-1 rounded-xl border border-neutral-200 p-1 sm:w-auto sm:justify-start">
              <button
                onClick={handleRemoveOne}
                aria-label={quantityInCart === 1 ? `Quitar ${product.name} del carrito` : `Quitar una unidad de ${product.name}`}
                className="o-focus flex size-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-red-600"
              >
                {quantityInCart === 1 ? <Trash2 className="size-4" /> : <Minus className="size-4" />}
              </button>
              <span className="tabular w-6 text-center text-sm font-semibold text-neutral-900" aria-live="polite">
                {quantityInCart}
              </span>
              <button
                onClick={handleAddOne}
                disabled={product.stock !== undefined && quantityInCart >= product.stock}
                aria-label={`Agregar una unidad de ${product.name}`}
                className="o-focus flex size-8 items-center justify-center rounded-lg bg-brand-600 text-white transition-colors hover:bg-brand-700 disabled:opacity-40"
              >
                <Plus className="size-4" strokeWidth={2.5} />
              </button>
            </div>
          ) : (
            <button
              onClick={handleAddOne}
              disabled={isAdding || outOfStock}
              aria-label={outOfStock ? `${product.name} sin stock` : `Agregar ${product.name} al carrito`}
              className={`o-focus flex h-10 w-full shrink-0 items-center justify-center rounded-xl transition-colors sm:w-10 ${
                outOfStock
                  ? 'cursor-not-allowed bg-neutral-100 text-neutral-300'
                  : 'bg-brand-600 text-white hover:bg-brand-700'
              }`}
            >
              <Plus strokeWidth={2.5} className="size-5" />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export default memo(ProductCard);
