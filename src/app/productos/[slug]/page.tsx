"use client";

import { useState, useEffect, use, useRef } from "react";
import Link from "next/link";
import ImageWithFallback from '@/components/ui/ImageWithFallback';
import { ArrowLeftIcon, MinusIcon, PlusIcon } from "@heroicons/react/24/outline";
import Button from "@/components/ui/Button";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/contexts/ToastContext";
import { useProducts, Product } from "@/contexts/ProductContext";
import { buildSingleProductLink } from "@/utils/whatsapp";
import { WHATSAPP_PHONE } from "@/config/constants";

export default function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { products, loading, trackProductView, trackOrderIntent } = useProducts();
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const { addToCart } = useCart();
  const { showToast } = useToast();

  // Encontrar el producto por el slug
  const product = products.find((p) => p.slug === slug);

  const viewTrackedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!loading && product && viewTrackedRef.current !== product.id) {
      trackProductView(product.id);
      viewTrackedRef.current = product.id;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, product?.id, trackProductView]);

  // Reset selected image when product changes
  useEffect(() => {
    setSelectedImage(0);
  }, [product?.id]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
        <p className="text-gray-500">Cargando producto...</p>
      </div>
    );
  }

  // Si no se encuentra el producto
  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Producto no encontrado</h1>
        <p className="text-gray-500 mb-8">Lo sentimos, el producto que buscas no existe o ha sido eliminado.</p>
        <Link href="/productos">
          <Button>Volver a productos</Button>
        </Link>
      </div>
    );
  }

  // Obtener productos relacionados
  // Si en ProductContext no existe relatedProducts, derivar algunos similares por categoría
  const relatedProducts: Product[] = products
    .filter(p => p.id !== product.id && p.categories?.some(cat => product.categories?.includes(cat)))
    .slice(0, 4);

  // Manejar la cantidad
  const increaseQuantity = () => {
    if (quantity < product.stock) {
      setQuantity(quantity + 1);
    }
  };

  const decreaseQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  // Calculate effective price
  const basePrice = product.price;
  const offerPrice = product.offerPrice;
  const hasDiscount = !!(offerPrice && offerPrice > 0 && offerPrice < basePrice);
  const effectivePrice = hasDiscount ? offerPrice : basePrice;

  // Manejar agregar al carrito
  const handleAddToCart = () => {
    const { id, name, image, slug } = product;

    // Agregar al carrito la cantidad seleccionada
    addToCart({ id, name, price: effectivePrice, image, slug }, quantity);

    // Reset quantity
    setQuantity(1);

    // Mostrar mensaje de éxito
    showToast(`¡${quantity}x ${product.name} añadido al carrito!`, 'success');
  };

  const handleWhatsApp = () => {
    trackOrderIntent(product.id);
    const link = buildSingleProductLink(WHATSAPP_PHONE, product, quantity);
    window.open(link, '_blank');
  };

  // Combinar imagen principal con galería para tener una lista completa
  const allImages = [product.image, ...(product.gallery || [])].filter(Boolean);

  console.log("Product Detail State:", {
    selectedImage,
    totalImages: allImages.length,
    currentImage: allImages[selectedImage],
    allImages
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pb-32 md:pb-12">
      {/* Navegación de regreso */}
      <div className="mb-6">
        <Link href="/productos" className="inline-flex items-center text-emerald-600 hover:text-emerald-800 transition-colors font-medium">
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Volver a productos
        </Link>
      </div>

      {/* Contenedor principal */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 p-4 sm:p-6 lg:p-10">
          {/* Galería de imágenes */}
          <div>
            <div className="rounded-2xl overflow-hidden mb-4 h-[300px] sm:h-[400px] md:h-[500px] bg-gray-50 flex items-center justify-center relative shadow-inner">
              <ImageWithFallback
                key={allImages[selectedImage] || 'main-image'}
                src={allImages[selectedImage] || product.image || "/file.svg"}
                alt={product.name}
                className="w-full h-full object-cover"
              />
              {hasDiscount && (
                <div className="absolute top-4 right-4 bg-red-600 text-white font-black px-3 py-1.5 rounded-xl shadow-lg text-sm">
                  -{Math.round(((basePrice - offerPrice!) / basePrice) * 100)}%
                </div>
              )}
            </div>
            {allImages.length > 1 && (
              <div className="grid grid-cols-4 gap-2 sm:gap-3">
                {allImages.map((image, index) => (
                  <button
                    key={index}
                    className={`relative rounded-xl overflow-hidden h-20 sm:h-24 border-2 transition-all ${selectedImage === index
                      ? "border-emerald-500 ring-2 ring-emerald-200 ring-offset-1"
                      : "border-transparent hover:border-emerald-200"
                      }`}
                    onClick={() => {
                      setSelectedImage(index);
                    }}
                  >
                    <ImageWithFallback
                      src={image || "/file.svg"}
                      alt={`${product.name} - vista ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Información del producto */}
          <div className="flex flex-col">
            <h1 className="text-3xl sm:text-4xl font-black text-gray-900 mb-2 tracking-tight">{product.name}</h1>
            <div className="flex items-center gap-2 mb-6">
              <span className="text-sm text-gray-500 font-medium tracking-wide">Categoría:</span>
              <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full uppercase tracking-widest border border-emerald-100">
                {product.categories?.join(', ') || 'General'}
              </span>
            </div>

            <div className="text-3xl sm:text-4xl font-black text-emerald-600 mb-6 flex flex-wrap items-end gap-3">
              <span className="leading-none">$ {effectivePrice.toLocaleString('es-CL')}</span>
              {hasDiscount && (
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg sm:text-xl line-through font-medium text-gray-400">$ {basePrice.toLocaleString('es-CL')}</span>
                </div>
              )}
            </div>

            <p className="text-gray-600 mb-8 leading-relaxed text-base sm:text-lg">{product.description}</p>

            {/* Características */}
            {product.features && product.features.length > 0 && (
              <div className="mb-8 p-5 sm:p-6 bg-gray-50 rounded-2xl border border-gray-100 shadow-sm">
                <h3 className="text-base sm:text-lg font-bold mb-4 text-gray-900 flex items-center gap-2">
                  <div className="w-1 h-5 bg-emerald-500 rounded-full" />
                  Características Principales
                </h3>
                <ul className="text-gray-700 space-y-3 text-sm sm:text-base">
                  {product.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                      <span className="font-medium">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Disponibilidad */}
            <div className="mb-8">
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className={`flex items-center gap-2 font-bold px-3 py-1.5 rounded-xl border ${product.stock > 0 ? "text-emerald-700 bg-emerald-50 border-emerald-100" : "text-red-600 bg-red-50 border-red-100"}`}>
                  <span className={`w-2.5 h-2.5 rounded-full ${product.stock > 0 ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`}></span>
                  {product.stock > 0 ? `${product.stock} unidades en stock` : "Agotado temporalmente"}
                </span>
                {product.stock > 0 && product.stock <= 5 && (
                  <span className="text-[10px] bg-amber-500 text-white px-3 py-1 rounded-full font-black uppercase tracking-wider shadow-sm">
                    ¡Quedan pocas!
                  </span>
                )}
              </div>
            </div>

            {/* Controles de cantidad y acciones (Desktop) */}
            <div className="bg-white border-t border-gray-100 pt-6 sm:pt-8 mt-auto hidden md:block">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex justify-center sm:justify-start">
                  <div className="inline-flex items-center border-2 border-gray-100 rounded-2xl h-[56px] bg-gray-50/50">
                    <button
                      type="button"
                      className="px-5 h-full text-gray-500 hover:text-emerald-600 hover:bg-white rounded-l-2xl transition-all disabled:opacity-30"
                      onClick={decreaseQuantity}
                      disabled={quantity <= 1}
                    >
                      <MinusIcon className="h-5 w-5 stroke-[2.5]" />
                    </button>
                    <input
                      type="number"
                      min="1"
                      max={product.stock}
                      value={quantity}
                      readOnly
                      className="w-14 text-center h-full border-x border-gray-100 focus:outline-none font-black text-gray-900 bg-transparent text-lg"
                    />
                    <button
                      type="button"
                      className="px-5 h-full text-gray-500 hover:text-emerald-600 hover:bg-white rounded-r-2xl transition-all disabled:opacity-30"
                      onClick={increaseQuantity}
                      disabled={quantity >= product.stock}
                    >
                      <PlusIcon className="h-5 w-5 stroke-[2.5]" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 flex flex-col sm:flex-row gap-3">
                  <Button fullWidth size="lg" onClick={handleAddToCart} className="flex-1 shadow-xl shadow-emerald-600/20 text-base font-bold rounded-2xl h-[56px]">
                    Agregar al Carrito
                  </Button>
                  <Link href="/checkout" className="flex-1" onClick={handleAddToCart}>
                    <Button variant="outline" fullWidth size="lg" className="h-[56px] border-2 text-base font-bold rounded-2xl hover:bg-gray-50">
                      Comprar Ahora
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="mt-6 flex justify-center">
                <button
                  onClick={handleWhatsApp}
                  className="flex items-center gap-2 text-emerald-600 font-bold hover:text-emerald-700 transition-colors py-2 px-4 rounded-xl hover:bg-emerald-50"
                >
                  <span className="text-xl">💬</span>
                  Consultar disponibilidad por WhatsApp
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Action Bar (Mobile Only) */}
      <div className="md:hidden fixed bottom-16 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-gray-100 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] p-4 animate-in slide-in-from-bottom duration-500">
        <div className="flex items-center gap-4 max-w-lg mx-auto">
          <div className="flex flex-col shrink-0 min-w-[100px]">
            <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest leading-none mb-1">Total</span>
            <span className="text-xl font-black text-gray-900 leading-none">
              $ {(effectivePrice * quantity).toLocaleString('es-CL')}
            </span>
          </div>

          <div className="flex-1 flex gap-2 h-14">
            <div className="flex items-center bg-gray-100 rounded-2xl px-1 border border-gray-200">
              <button
                onClick={decreaseQuantity}
                disabled={quantity <= 1}
                className="w-10 h-10 flex items-center justify-center text-gray-500 disabled:opacity-20"
              >
                <MinusIcon className="w-4 h-4 stroke-[3]" />
              </button>
              <span className="w-6 text-center font-black text-sm">{quantity}</span>
              <button
                onClick={increaseQuantity}
                disabled={quantity >= product.stock}
                className="w-10 h-10 flex items-center justify-center text-gray-500 disabled:opacity-20"
              >
                <PlusIcon className="w-4 h-4 stroke-[3]" />
              </button>
            </div>

            <Button
              fullWidth
              onClick={handleAddToCart}
              className="rounded-2xl shadow-lg shadow-emerald-500/20 font-black text-sm px-2"
            >
              AGREGAR
            </Button>
          </div>
        </div>
      </div>

      {/* Productos relacionados */}
      {relatedProducts.length > 0 && (
        <div className="border-t border-gray-100 pt-16">
          <div className="flex flex-col items-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mb-2 tracking-tight">También te podría interesar</h2>
            <div className="w-12 h-1.5 bg-emerald-500 rounded-full" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {relatedProducts.map((relatedProduct) => (
              <div key={relatedProduct.id} className="h-full">
                <Link href={`/productos/${relatedProduct.slug}`} className="group block bg-white rounded-3xl shadow-sm hover:shadow-xl transition-all duration-500 border border-gray-100 overflow-hidden h-full flex flex-col">
                  <div className="aspect-square overflow-hidden bg-gray-50 relative">
                    <ImageWithFallback
                      src={relatedProduct.image}
                      alt={relatedProduct.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                  </div>
                  <div className="p-4 sm:p-5 flex-1 flex flex-col">
                    <h3 className="text-xs sm:text-base font-bold text-gray-900 group-hover:text-emerald-600 transition-colors line-clamp-2 mb-3 leading-tight">{relatedProduct.name}</h3>
                    <div className="mt-auto flex items-center justify-between">
                      <p className="text-sm sm:text-lg font-black text-emerald-600 tracking-tight">$ {relatedProduct.price.toLocaleString('es-CL')}</p>
                      <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all">
                        <PlusIcon className="w-4 h-4 stroke-[3]" />
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
