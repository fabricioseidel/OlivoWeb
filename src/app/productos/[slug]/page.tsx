"use client";

import { useState, useEffect, use, useRef } from "react";
import Link from "next/link";
import { ArrowLeftIcon, MinusIcon, PlusIcon } from "@heroicons/react/24/outline";
import Button from "@/components/ui/Button";
import { useCart } from "@/contexts/CartContext";
import { useProducts, Product } from "@/contexts/ProductContext";
import { buildSingleProductLink } from "@/utils/whatsapp";
import { WHATSAPP_PHONE } from "@/config/constants";

export default function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { products, loading, trackProductView, trackOrderIntent } = useProducts();
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const { addToCart } = useCart();

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
    .slice(0,4);

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
    for (let i = 0; i < quantity; i++) {
      addToCart({ id, name, price, image, slug });
    }
    
    // Reset quantity
    setQuantity(1);
    
    // Opcional: Mostrar mensaje de éxito
    alert(`${quantity} ${product.name} agregado(s) al carrito`);
  };

  const handleWhatsApp = () => {
    trackOrderIntent(product.id);
    const link = buildSingleProductLink(WHATSAPP_PHONE, product, quantity);
    window.open(link, '_blank');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Navegación de regreso */}
      <div className="mb-6">
        <Link href="/productos" className="inline-flex items-center text-blue-600 hover:text-blue-800">
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Volver a productos
        </Link>
      </div>

      {/* Contenedor principal */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6">
          {/* Galería de imágenes */}
          <div>
            <div className="rounded-lg overflow-hidden mb-4 h-96 bg-gray-50 flex items-center justify-center">
              <img
                src={(product.gallery && product.gallery.length > 0 ? product.gallery[selectedImage] : product.image) || product.image}
                alt={product.name}
                className="w-full h-full object-cover"
                loading="eager"
              />
            </div>
            {product.gallery && product.gallery.length > 1 && (
              <div className="grid grid-cols-3 gap-2">
                {product.gallery.map((image, index) => (
                  <div
                    key={index}
                    className={`cursor-pointer rounded-md overflow-hidden h-24 border-2 ${
                      selectedImage === index ? "border-blue-500" : "border-transparent"
                    }`}
                    onClick={() => setSelectedImage(index)}
                  >
                    <img
                      src={image}
                      alt={`${product.name} - vista ${index + 1}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Información del producto */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>
            <div className="text-sm text-gray-500 mb-4">
              Categorías: <span className="font-medium">{product.categories?.join(', ')}</span>
            </div>
            <div className="text-2xl font-bold text-blue-600 mb-4 flex items-center gap-3">
              <span>$ {product.price.toFixed(2)}</span>
              {product.priceOriginal && product.priceOriginal > product.price && (
                <>
                  <span className="text-lg line-through font-normal text-gray-400">$ {product.priceOriginal.toFixed(2)}</span>
                  <span className="text-sm bg-red-100 text-red-600 font-semibold px-2 py-0.5 rounded">
                    -{Math.round(((product.priceOriginal - product.price)/product.priceOriginal)*100)}%
                  </span>
                </>
              )}
            </div>
            <p className="text-gray-700 mb-6">{product.description}</p>

            {/* Características */}
            {product.features && product.features.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Características:</h3>
                <ul className="list-disc pl-5 text-gray-700 space-y-1">
                  {product.features.map((feature, index) => (
                    <li key={index}>{feature}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Disponibilidad */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Disponibilidad:</h3>
              <div className="flex items-center gap-3 text-sm">
                <span className={product.stock > 0 ? "text-green-600" : "text-red-600"}>
                  {product.stock > 0 ? `${product.stock} unidades disponibles` : "Agotado temporalmente"}
                </span>
                {product.stock > 0 && product.stock <= 5 && (
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">Pocas unidades</span>
                )}
              </div>
            </div>

            {/* Controles de cantidad */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Cantidad:</h3>
              <div className="flex items-center">
                <button
                  type="button"
                  className="p-2 border border-gray-300 rounded-l-md bg-gray-50 hover:bg-gray-100"
                  onClick={decreaseQuantity}
                  disabled={quantity <= 1}
                >
                  <MinusIcon className="h-4 w-4" />
                </button>
                <input
                  type="number"
                  min="1"
                  max={product.stock}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.min(Math.max(1, parseInt(e.target.value) || 1), product.stock))}
                  className="p-2 w-16 text-center border-t border-b border-gray-300 focus:outline-none focus:ring-0"
                />
                <button
                  type="button"
                  className="p-2 border border-gray-300 rounded-r-md bg-gray-50 hover:bg-gray-100"
                  onClick={increaseQuantity}
                  disabled={quantity >= product.stock}
                >
                  <PlusIcon className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button fullWidth size="lg" onClick={handleAddToCart}>
                Agregar al Carrito
              </Button>
              <Button variant="outline" fullWidth size="lg" onClick={handleWhatsApp}>
                Pedir por WhatsApp
              </Button>
              <Link href="/checkout">
                <Button variant="outline" fullWidth size="lg" onClick={handleAddToCart}>
                  Comprar Ahora
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Productos relacionados */}
      {relatedProducts.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Productos Relacionados</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {relatedProducts.map((relatedProduct) => (
              <div key={relatedProduct?.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                <Link href={`/productos/${relatedProduct?.slug}`}>
                  <div className="h-48 overflow-hidden">
                    <img
                      src={relatedProduct?.image}
                      alt={relatedProduct?.name}
                      className="w-full h-full object-cover hover:scale-110 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">{relatedProduct?.name}</h3>
                    <p className="text-blue-600 font-semibold mb-4">$ {relatedProduct?.price.toFixed(2)}</p>
                    <Button fullWidth>Ver Producto</Button>
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
