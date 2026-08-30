"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import ImageWithFallback from '@/components/ui/ImageWithFallback';
import { ArrowLeftIcon, MinusIcon, PlusIcon, ChatBubbleLeftRightIcon } from "@heroicons/react/24/outline";
import { X } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/contexts/ToastContext";
import { useProducts, Product } from "@/contexts/ProductContext";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { isProductVisible } from "@/services/products";
import { buildSingleProductLink } from "@/utils/whatsapp";
import { WHATSAPP_PHONE } from "@/config/constants";
import ProductCard from "@/components/ProductCard";

const clp = (n: number) => `$${Math.round(n).toLocaleString('es-CL')}`;

export default function ProductDetailClient({ slug }: { slug: string }) {
  const { products, loading, trackProductView, trackOrderIntent, fetchDetails } = useProducts();
  const { settings } = useStoreSettings();
  const [fullProduct, setFullProduct] = useState<Product | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const { addToCart } = useCart();
  const { showToast } = useToast();

  const product = products.find((p) => p.slug === slug);

  const viewTrackedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!loading && product && viewTrackedRef.current !== product.id) {
      trackProductView(product.id);
      viewTrackedRef.current = product.id;
    }
  }, [loading, product, trackProductView]);

  useEffect(() => {
    setSelectedImage(0);
    if (product?.id) {
       setLoadingDetails(true);
       fetchDetails(product.id)
         .then(data => setFullProduct(data))
         .catch(err => console.error("Error loading product details", err))
         .finally(() => setLoadingDetails(false));
    }
  }, [product?.id, fetchDetails]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-white p-4">
        <div className="size-10 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
        <span className="text-sm text-neutral-500">Cargando producto…</span>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white p-4 text-center">
        <div className="mb-5 flex size-16 items-center justify-center rounded-full bg-red-50">
          <X className="size-7 text-red-500" />
        </div>
        <h1 className="o-h1 mb-2 text-neutral-900">Producto no encontrado</h1>
        <p className="o-body mx-auto mb-8 max-w-sm text-neutral-500">
          El producto que buscas no existe o ya no está en nuestro catálogo.
        </p>
        <Link
          href="/productos"
          className="o-focus flex h-12 items-center rounded-xl bg-brand-boton px-7 font-semibold text-brand-contraste transition-colors hover:bg-brand-700"
        >
          Volver a la tienda
        </Link>
      </div>
    );
  }

  const relatedProducts: Product[] = products
    .filter(p => p.isActive && isProductVisible(p) && p.id !== product.id && p.categories?.some(cat => product.categories?.includes(cat)))
    .slice(0, 4);

  const increaseQuantity = () => {
    if (quantity < product.stock) setQuantity(quantity + 1);
  };

  const decreaseQuantity = () => {
    if (quantity > 1) setQuantity(quantity - 1);
  };

  const basePrice = product.price;
  const offerPrice = product.offerPrice;
  const hasDiscount = !!(offerPrice && offerPrice > 0 && offerPrice < basePrice);
  const effectivePrice = hasDiscount ? offerPrice : basePrice;
  const discountPercent = hasDiscount
    ? Math.round(((basePrice - offerPrice!) / basePrice) * 100)
    : 0;

  const description = fullProduct?.description || product.description;
  const gallery = fullProduct?.gallery || product.gallery || [];
  const features = fullProduct?.features || product.features || [];

  const outOfStock = product.stock <= 0;
  const lowStock = product.stock > 0 && product.stock <= 5;

  const handleAddToCart = () => {
    const { id, name, image, slug } = product;
    addToCart({ id, name, price: effectivePrice, image, slug }, quantity);
    setQuantity(1);
    showToast(`${quantity}x ${product.name} añadido al carrito`, 'success');
  };

  const handleWhatsApp = () => {
    trackOrderIntent(product.id);
    // El teléfono sale de la configuración de la tienda; el constante queda
    // solo como respaldo si el admin todavía no lo definió.
    const phone = settings?.storePhone || WHATSAPP_PHONE;
    const link = buildSingleProductLink(
      phone,
      { name: product.name, price: effectivePrice },
      quantity
    );
    window.open(link, '_blank');
  };

  const allImages = [product.image, ...gallery].filter(Boolean);

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-neutral-100 bg-neutral-50/60">
        <div className="o-container py-3">
          <Link
            href="/productos"
            className="o-focus group inline-flex items-center gap-1.5 rounded-lg text-sm font-medium text-neutral-500 transition-colors hover:text-brand-700"
          >
            <ArrowLeftIcon className="size-4 transition-transform group-hover:-translate-x-0.5" />
            Volver al catálogo
          </Link>
        </div>
      </div>

      <div className="o-container py-8 md:py-12">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
          {/* ── Galería ── */}
          <div>
            <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-50 p-6 sm:p-10">
              <ImageWithFallback
                key={allImages[selectedImage] || 'main-image'}
                src={allImages[selectedImage] || product.image || "/file.svg"}
                alt={product.name}
                className="max-h-full max-w-full object-contain"
              />
              {hasDiscount && (
                <span className="absolute left-4 top-4 rounded-md bg-red-600 px-2.5 py-1 text-sm font-semibold text-white">
                  −{discountPercent}%
                </span>
              )}
              {loadingDetails && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/60">
                  <div className="size-7 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
                </div>
              )}
            </div>

            {allImages.length > 1 && (
              <div className="mt-3 flex gap-2.5 overflow-x-auto pb-1">
                {allImages.map((image, index) => (
                  <button
                    key={index}
                    type="button"
                    aria-label={`Ver imagen ${index + 1} de ${product.name}`}
                    aria-current={selectedImage === index}
                    className={`o-focus flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-neutral-50 p-1.5 transition-colors sm:size-20 ${
                      selectedImage === index
                        ? "border-brand-500 bg-white"
                        : "border-neutral-200 hover:border-neutral-300"
                    }`}
                    onClick={() => setSelectedImage(index)}
                  >
                    <ImageWithFallback
                      src={image || "/file.svg"}
                      alt=""
                      className="h-full w-full object-contain"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Información ── */}
          <div className="flex flex-col">
            {(product.categories?.length || lowStock) && (
              <div className="mb-3 flex flex-wrap items-center gap-2">
                {product.categories?.map(cat => (
                  <Link
                    key={cat}
                    href={`/categorias/${encodeURIComponent(cat)}`}
                    className="o-focus rounded-md bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-200"
                  >
                    {cat}
                  </Link>
                ))}
                {lowStock && (
                  <span className="rounded-md bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
                    Quedan {product.stock}
                  </span>
                )}
              </div>
            )}

            <h1 className="o-display mb-3 text-neutral-900">{product.name}</h1>

            <div className="mb-5 flex flex-wrap items-baseline gap-3">
              <span className="tabular text-3xl font-bold text-neutral-900">
                {clp(effectivePrice)}
              </span>
              {hasDiscount && (
                <span className="tabular text-lg text-neutral-400 line-through">
                  {clp(basePrice)}
                </span>
              )}
            </div>

            {loadingDetails && !description ? (
              <div className="mb-6 animate-pulse space-y-2">
                <div className="h-4 w-full rounded bg-neutral-100" />
                <div className="h-4 w-5/6 rounded bg-neutral-100" />
                <div className="h-4 w-4/6 rounded bg-neutral-100" />
              </div>
            ) : description ? (
              <p className="o-body mb-6 text-neutral-600">{description}</p>
            ) : null}

            {(features.length > 0 || loadingDetails) && (
              <ul className="mb-7 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {loadingDetails && features.length === 0 ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <li key={i} className="h-11 animate-pulse rounded-xl bg-neutral-50" />
                  ))
                ) : features.map((feature, index) => (
                  <li
                    key={index}
                    className="flex items-center gap-2.5 rounded-xl border border-neutral-200 px-3.5 py-2.5"
                  >
                    <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-brand-600" />
                    <span className="text-sm text-neutral-700">{feature}</span>
                  </li>
                ))}
              </ul>
            )}

            {/* ── Compra ── */}
            <div className="mt-auto">
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="inline-flex h-13 items-center rounded-xl border border-neutral-200">
                  <button
                    type="button"
                    aria-label="Disminuir cantidad"
                    className="o-focus flex h-full items-center px-4 text-neutral-600 transition-colors hover:bg-neutral-50 disabled:opacity-30"
                    onClick={decreaseQuantity}
                    disabled={quantity <= 1}
                  >
                    <MinusIcon className="size-4" />
                  </button>
                  <span className="tabular w-10 text-center text-base font-semibold text-neutral-900" aria-live="polite">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    aria-label="Aumentar cantidad"
                    className="o-focus flex h-full items-center px-4 text-neutral-600 transition-colors hover:bg-neutral-50 disabled:opacity-30"
                    onClick={increaseQuantity}
                    disabled={quantity >= product.stock}
                  >
                    <PlusIcon className="size-4" />
                  </button>
                </div>

                <button
                  onClick={handleAddToCart}
                  disabled={outOfStock}
                  className="o-focus h-13 flex-1 rounded-xl bg-brand-boton text-base font-semibold text-brand-contraste transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-500"
                >
                  {outOfStock ? 'Sin stock' : 'Agregar al carrito'}
                </button>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 pt-4">
                <button
                  onClick={handleWhatsApp}
                  className="o-focus inline-flex items-center gap-2 rounded-lg text-sm font-medium text-neutral-700 transition-colors hover:text-brand-700"
                >
                  <ChatBubbleLeftRightIcon className="size-4" />
                  Consultar por WhatsApp
                </button>
                <p className={`text-sm ${outOfStock ? "text-red-600" : "text-neutral-500"}`}>
                  {outOfStock
                    ? "No disponible"
                    : lowStock
                    ? `Últimas ${product.stock} unidades`
                    : "Disponible"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Relacionados ── */}
        {relatedProducts.length > 0 && (
          <section className="mt-16 border-t border-neutral-100 pt-10 md:mt-20 md:pt-12">
            <h2 className="o-h2 mb-6 text-neutral-900">También te podría interesar</h2>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-5">
              {relatedProducts.map((relatedProduct) => (
                <ProductCard
                  key={relatedProduct.id}
                  product={{
                    id: relatedProduct.id,
                    name: relatedProduct.name,
                    slug: relatedProduct.slug || relatedProduct.id,
                    price: relatedProduct.price,
                    offerPrice: relatedProduct.offerPrice,
                    image: relatedProduct.image,
                    categories: relatedProduct.categories || [],
                    description: relatedProduct.description || "",
                    featured: relatedProduct.featured,
                    stock: relatedProduct.stock
                  }}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
