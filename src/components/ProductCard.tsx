"use client";

import React from "react";
import Link from "next/link";
import { Card, CardBody, CardFooter, CardMedia, CardTitle, CardSubtitle } from "@/components/ui/Card";
import { formatCurrency } from "@/utils/currency";
import { normalizeImage } from "@/utils/image";
import { useCart } from "@/contexts/CartContext";

export type ProductUI = {
  id: string;
  name: string;
  slug: string;
  price: number;
  sale_price?: number | null;
  image_url?: string | null;
  category?: { name: string } | null;
  featured?: boolean;
};

type Props = { product: ProductUI };

export default function ProductCard({ product }: Props) {
  const { addToCart } = useCart();
  const price = product.sale_price ?? product.price;
  const image = normalizeImage(product.image_url);

  const handleAdd = () => {
    addToCart(
      {
        id: product.id,
        name: product.name,
        price: price || 0,
        image: image,
        slug: product.slug,
      }
    );
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
        <button
          onClick={handleAdd}
          className="w-full inline-flex items-center justify-center rounded-xl bg-blue-600 text-white font-medium py-2.5 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition"
        >
          Añadir al carrito
        </button>
      </CardFooter>
    </Card>
  );
}
