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

  // Manejar agregar al carrito
  const handleAddToCart = () => {
    const { id, name, price, image, slug } = product;

    // Agregar al carrito la cantidad seleccionada
    addToCart({ id, name, price, image, slug }, quantity);

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Navegación de regreso */}
      <div className="mb-6">
        <Link href="/productos" className="inline-flex items-center text-emerald-600 hover:text-emerald-800 transition-colors font-medium">
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Volver a productos
        </Link>
      </div>

      {/* Contenedor principal */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 lg:p-10">
          {/* Galería de imágenes */}
          <div>
            <div className="rounded-2xl overflow-hidden mb-4 h-[500px] bg-gray-50 flex items-center justify-center relative">
              <ImageWithFallback
                key={allImages[selectedImage] || 'main-image'}
                src={allImages[selectedImage] || product.image}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
            {allImages.length > 1 && (
              <div className="grid grid-cols-4 gap-3">
                {allImages.map((image, index) => (
                  <button
                    key={index}
                    className={`relative rounded-xl overflow-hidden h-24 border-2 transition-all ${selectedImage === index
                        ? "border-emerald-500 ring-2 ring-emerald-200 ring-offset-1"
                        : "border-transparent hover:border-emerald-200"
                      }`}
                    onClick={() => {
                      setSelectedImage(index);
                    }}
                  >
                    <ImageWithFallback
                      src={image}
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
            <h1 className="text-4xl font-bold text-gray-900 mb-2">{product.name}</h1>
            <div className="flex items-center gap-2 mb-6">
              <span className="text-sm text-gray-500">Categoría:</span>
              <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-sm font-semibold rounded-full uppercase tracking-wide">
                {product.categories?.join(', ') || 'General'}
              </span>
            </div>

            <div className="text-3xl font-bold text-emerald-600 mb-6 flex items-center gap-3">
              <span>$ {product.price.toFixed(2)}</span>
              {product.priceOriginal && product.priceOriginal > product.price && (
                <>
                  <span className="text-xl line-through font-normal text-gray-400">$ {product.priceOriginal.toFixed(2)}</span>
                  <span className="text-sm bg-red-100 text-red-600 font-bold px-2 py-1 rounded-full">
                    -{Math.round(((product.priceOriginal - product.price) / product.priceOriginal) * 100)}%
                  </span>
                </>
              )}
            </div>

            <p className="text-gray-600 mb-8 leading-relaxed text-lg">{product.description}</p>

            {/* Características */}
            {product.features && product.features.length > 0 && (
              <div className="mb-8 p-6 bg-gray-50 rounded-xl">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Características:</h3>
                <ul className="text-gray-700 space-y-2">
                  {product.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-emerald-500 mt-1.5">•</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Disponibilidad */}
            <div className="mb-8">
              <div className="flex items-center gap-3 text-sm">
                <span className={`flex items-center gap-1.5 font-medium ${product.stock > 0 ? "text-emerald-700" : "text-red-600"}`}>
                  <span className={`w-2.5 h-2.5 rounded-full ${product.stock > 0 ? "bg-emerald-500" : "bg-red-500"}`}></span>
                  {product.stock > 0 ? `${product.stock} unidades disponibles` : "Agotado temporalmente"}
                </span>
                {product.stock > 0 && product.stock <= 5 && (
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">¡Pocas unidades!</span>
                )}
              </div>
            </div>

            {/* Controles de cantidad y acciones */}
            <div className="bg-white border-t border-gray-100 pt-8 mt-auto">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex items-center border border-gray-300 rounded-xl h-[52px]">
                  <button
                    type="button"
                    className="px-4 h-full text-gray-500 hover:text-emerald-600 hover:bg-gray-50 rounded-l-xl transition-colors disabled:opacity-50"
                    onClick={decreaseQuantity}
                    disabled={quantity <= 1}
                  >
                    <MinusIcon className="h-5 w-5" />
                  </button>
                  <input
                    type="number"
                    min="1"
                    max={product.stock}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.min(Math.max(1, parseInt(e.target.value) || 1), product.stock))}
                    className="w-16 text-center h-full border-x border-gray-300 focus:outline-none font-semibold text-gray-900"
                  />
                  <button
                    type="button"
                    className="px-4 h-full text-gray-500 hover:text-emerald-600 hover:bg-gray-50 rounded-r-xl transition-colors disabled:opacity-50"
                    onClick={increaseQuantity}
                    disabled={quantity >= product.stock}
                  >
                    <PlusIcon className="h-5 w-5" />
                  </button>
                </div>

                <div className="flex-1 flex gap-3">
                  <Button fullWidth size="lg" onClick={handleAddToCart} className="flex-1 shadow-lg shadow-emerald-600/20">
                    Agregar al Carrito
                  </Button>
                  <Link href="/checkout" className="flex-1" onClick={handleAddToCart}>
                    <Button variant="outline" fullWidth size="lg" className="h-full border-2">
                      Comprar Ahora
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="mt-4">
                <Button variant="ghost" fullWidth size="sm" onClick={handleWhatsApp} className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50">
                  <span className="mr-2">💬</span> Pedir por WhatsApp
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Productos relacionados */}
      {relatedProducts.length > 0 && (
        <div className="border-t border-gray-200 pt-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">También te podría interesar</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {relatedProducts.map((relatedProduct) => (
              <div key={relatedProduct.id} className="h-full">
                <Link href={`/productos/${relatedProduct.slug}`} className="group block bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden h-full flex flex-col">
                  <div className="aspect-[4/3] overflow-hidden bg-gray-100 relative">
                    <ImageWithFallback
                      src={relatedProduct.image}
                      alt={relatedProduct.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-4 flex-1 flex flex-col">
                    <h3 className="text-base font-semibold text-gray-900 group-hover:text-emerald-600 transition-colors line-clamp-2 mb-2">{relatedProduct.name}</h3>
                    <div className="mt-auto">
                      <p className="text-lg font-bold text-emerald-600">$ {relatedProduct.price.toFixed(2)}</p>
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
