"use client";

import { useState, useEffect, use, useRef } from "react";
import Link from "next/link";
import ImageWithFallback from '@/components/ui/ImageWithFallback';
import { ArrowLeftIcon, MinusIcon, PlusIcon } from "@heroicons/react/24/outline";
import { Sparkles, X } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/contexts/ToastContext";
import { useProducts, Product } from "@/contexts/ProductContext";
import { buildSingleProductLink } from "@/utils/whatsapp";
import { WHATSAPP_PHONE } from "@/config/constants";
import ProductCard from "@/components/ProductCard";

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
  }, [loading, product, trackProductView]);

  // Reset selected image when product changes
  useEffect(() => {
    setSelectedImage(0);
  }, [product?.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-white">
        <div className="size-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <span className="text-gray-500 font-black uppercase tracking-widest text-[10px]">Cargando detalles...</span>
      </div>
    );
  }

  // Si no se encuentra el producto
  if (!product) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-white text-center">
            <div className="size-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
                <X className="size-10 text-red-500" />
            </div>
            <h1 className="text-3xl font-black text-gray-900 mb-4">Producto no encontrado</h1>
            <p className="text-gray-500 mb-8 max-w-sm mx-auto font-medium leading-relaxed">Lo sentimos, el producto que buscas no existe o ha sido eliminado de nuestro catálogo.</p>
            <Link href="/productos">
                <button className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-900/10 active:scale-95">
                    Volver a la tienda
                </button>
            </Link>
        </div>
    );
  }

  // Obtener productos relacionados
  const relatedProducts: Product[] = products
    .filter(p => p.isActive && p.id !== product.id && p.categories?.some(cat => product.categories?.includes(cat)))
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
    addToCart({ id, name, price: effectivePrice, image, slug }, quantity);
    setQuantity(1);
    showToast(`¡${quantity}x ${product.name} añadido al carrito!`, 'success');
  };

  const handleWhatsApp = () => {
    trackOrderIntent(product.id);
    const link = buildSingleProductLink(WHATSAPP_PHONE, product, quantity);
    window.open(link, '_blank');
  };

  // Combinar imagen principal con galería
  const allImages = [product.image, ...(product.gallery || [])].filter(Boolean);

  return (
    <div className="bg-white min-h-screen">
      {/* Header Contextual */}
      <div className="bg-gray-50/50 border-b border-gray-100 py-4">
        <div className="max-w-7xl mx-auto px-4">
          <Link href="/productos" className="inline-flex items-center gap-2 text-gray-400 hover:text-emerald-600 transition-colors font-black uppercase text-[10px] tracking-widest">
            <ArrowLeftIcon className="h-3 w-3" />
            Volver al catálogo
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:py-16 pb-32 md:pb-24">
        {/* Contenedor principal */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 sm:gap-16">
          {/* Galería de imágenes */}
          <div className="space-y-6">
            <div className="aspect-square rounded-[3rem] overflow-hidden bg-gray-50 flex items-center justify-center relative shadow-inner border border-gray-100 p-8 sm:p-12">
              <ImageWithFallback
                key={allImages[selectedImage] || 'main-image'}
                src={allImages[selectedImage] || product.image || "/file.svg"}
                alt={product.name}
                className="max-w-full max-h-full object-contain mix-blend-multiply group-hover:scale-110 transition-transform duration-700"
              />
              {hasDiscount && (
                <div className="absolute top-8 right-8 bg-black/80 backdrop-blur-md text-white font-black px-4 py-2 rounded-2xl shadow-xl text-xs uppercase tracking-widest">
                  -{Math.round(((basePrice - offerPrice!) / basePrice) * 100)}% dcto
                </div>
              )}
            </div>
            
            {allImages.length > 1 && (
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                {allImages.map((image, index) => (
                  <button
                    key={index}
                    className={`relative rounded-2xl overflow-hidden size-20 sm:size-24 border-2 transition-all shrink-0 bg-gray-50 flex items-center justify-center p-2 ${
                        selectedImage === index ? "border-emerald-500 bg-white" : "border-gray-100 hover:border-emerald-200"
                    }`}
                    onClick={() => setSelectedImage(index)}
                  >
                    <ImageWithFallback
                      src={image || "/file.svg"}
                      alt={`${product.name} - vista ${index + 1}`}
                      className="w-full h-full object-contain mix-blend-multiply"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Información del producto */}
          <div className="flex flex-col">
            <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                    {product.categories?.map(cat => (
                        <span key={cat} className="px-3 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-black rounded-full uppercase tracking-widest border border-emerald-100 italic">
                            {cat}
                        </span>
                    ))}
                    {product.stock > 0 && product.stock <= 5 && (
                        <span className="text-[9px] bg-amber-500 text-white px-3 py-1 rounded-full font-black uppercase tracking-widest shadow-sm">
                            ¡Últimas unidades!
                        </span>
                    )}
                </div>
                <h1 className="text-4xl sm:text-5xl font-black text-gray-900 mb-4 tracking-tight leading-tight">{product.name}</h1>
                <div className="flex items-baseline gap-4 mb-6">
                    <span className="text-4xl font-black text-emerald-600 tracking-tighter">$ {effectivePrice.toLocaleString('es-CL')}</span>
                    {hasDiscount && (
                        <span className="text-xl line-through font-bold text-gray-300">$ {basePrice.toLocaleString('es-CL')}</span>
                    )}
                </div>
                <p className="text-gray-500 leading-relaxed text-lg font-medium">{product.description}</p>
            </div>

            {/* Características */}
            {product.features && product.features.length > 0 && (
              <div className="mb-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {product.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-3 p-4 bg-gray-50/50 rounded-2xl border border-gray-100">
                      <div className="size-2 rounded-full bg-emerald-500" />
                      <span className="font-bold text-sm text-gray-700">{feature}</span>
                    </div>
                  ))}
              </div>
            )}

            {/* Acciones */}
            <div className="mt-auto space-y-6">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="inline-flex items-center bg-gray-50 border border-gray-100 rounded-2xl p-1 h-16">
                        <button
                          type="button"
                          className="px-5 h-full text-gray-400 hover:text-emerald-600 transition-all disabled:opacity-20"
                          onClick={decreaseQuantity}
                          disabled={quantity <= 1}
                        >
                          <MinusIcon className="h-5 w-5 stroke-[3]" />
                        </button>
                        <span className="w-12 text-center font-black text-gray-900 text-xl">{quantity}</span>
                        <button
                          type="button"
                          className="px-5 h-full text-gray-400 hover:text-emerald-600 transition-all disabled:opacity-20"
                          onClick={increaseQuantity}
                          disabled={quantity >= product.stock}
                        >
                          <PlusIcon className="h-5 w-5 stroke-[3]" />
                        </button>
                    </div>
                    
                    <button 
                        onClick={handleAddToCart}
                        disabled={product.stock <= 0}
                        className="flex-1 bg-emerald-600 text-white rounded-2xl h-16 font-black uppercase text-sm tracking-widest shadow-xl shadow-emerald-900/10 hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale"
                    >
                        {product.stock > 0 ? 'Agregar al Carrito' : 'Agotado'}
                    </button>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between pt-6 border-t border-gray-100/50">
                    <button
                        onClick={handleWhatsApp}
                        className="flex items-center gap-2 group text-emerald-600 font-black uppercase text-[10px] tracking-widest"
                    >
                        <div className="size-10 bg-emerald-50 rounded-xl flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all">
                            <span className="text-xl">💬</span>
                        </div>
                        Consultar por WhatsApp
                    </button>
                    <div className="text-right">
                        <p className={`text-[10px] font-black uppercase tracking-widest ${product.stock > 0 ? "text-emerald-600" : "text-red-500"}`}>
                            {product.stock > 0 ? `Stock Disponible: ${product.stock}` : "No disponible"}
                        </p>
                    </div>
                </div>
            </div>
          </div>
        </div>

        {/* Productos Relacionados */}
        {relatedProducts.length > 0 && (
          <div className="mt-32 pt-20 border-t border-gray-100">
            <div className="flex flex-col items-center mb-16 text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full text-gray-500 text-[10px] font-black uppercase tracking-widest mb-4">
                    <Sparkles className="size-3" />
                    <span>Te encantará</span>
                </div>
                <h2 className="text-4xl font-black text-gray-900 tracking-tight">También te podría interesar</h2>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
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
          </div>
        )}
      </div>
    </div>
  );
}
