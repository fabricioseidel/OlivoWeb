"use client";

import React from "react";
import Link from "next/link";
import { Card, CardBody, CardFooter, CardMedia, CardTitle, CardSubtitle } from "@/components/ui/Card";
import { formatCurrency } from "@/utils/currency";
import { normalizeImage } from "@/utils/image";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/contexts/ToastContext";

export type ProductUI = {
  id: string;
  name: string;
  slug: string;
  price: number;
  sale_price?: number | null;
  image?: string | null; // Using fallback images since products table doesn't have image_url
  category?: { name: string } | null;
  featured?: boolean;
};

type Props = { product: ProductUI };

export default function ProductCard({ product }: Props) {
  const { addToCart, removeFromCart, cartItems, updateQuantity } = useCart();
  const { showToast } = useToast();
  const price = product.sale_price ?? product.price;
  const image = normalizeImage(product.image);
  const [qty, setQty] = React.useState<number>(1);

  const inCart = cartItems.find((i) => i.id === product.id);

  const handleAdd = () => {
    addToCart(
      {
        id: product.id,
        name: product.name,
        price: price || 0,
        image: image,
        slug: product.slug,
      },
      qty
    );
    showToast(`¡${product.name} añadido al carrito!`, 'success');
  };

  const handleRemove = () => {
    removeFromCart(product.id);
    showToast(`${product.name} eliminado del carrito`, 'info');
  };

  return (
    <Card className="h-full flex flex-col">
      <Link href={`/productos/${product.slug}`} className="block">
        <CardMedia src={image} alt={product.name} />
      </Link>

      <CardBody className="flex-1 flex flex-col gap-2">
        <CardTitle>
          <Link href={`/productos/${product.slug}`} className="hover:underline">
            {product.name}
          </Link>
        </CardTitle>

        {product.category?.name && (
          <CardSubtitle className="line-clamp-1">{product.category.name}</CardSubtitle>
        )}

        <div className="mt-auto">
          {product.sale_price ? (
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-emerald-600">
                {formatCurrency(product.sale_price)}
              </span>
              <span className="text-sm text-gray-400 line-through">
                {formatCurrency(product.price)}
              </span>
            </div>
          ) : (
            <div className="text-lg font-bold">{formatCurrency(product.price)}</div>
          )}
        </div>
      </CardBody>

      <CardFooter>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-gray-200">
            <button
              type="button"
              className="px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-l-lg"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              aria-label="Disminuir"
            >
              −
            </button>
            <input
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(Math.max(1, parseInt(e.target.value || '1', 10)))}
              className="w-12 text-center py-2 outline-none"
            />
            <button
              type="button"
              className="px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-r-lg"
              onClick={() => setQty((q) => q + 1)}
              aria-label="Aumentar"
            >
              +
            </button>
          </div>

          <button
            onClick={handleAdd}
            className="flex-1 inline-flex items-center justify-center rounded-xl bg-blue-600 text-white font-medium py-2.5 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition"
          >
            Añadir
          </button>

          {inCart && (
            <button
              onClick={handleRemove}
              className="inline-flex items-center justify-center rounded-xl bg-red-50 text-red-700 font-medium py-2.5 px-3 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition"
              title="Eliminar del carrito"
            >
              Quitar
            </button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
