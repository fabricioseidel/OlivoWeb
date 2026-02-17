"use client";

import { useState } from "react";
import Link from "next/link";
import { useProducts } from "@/contexts/ProductContext";
import ProductCard from "@/components/ProductCard";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import {
  ChevronRight,
  Star,
  Truck,
  Shield,
  Clock,
  Heart
} from "lucide-react";

export default function Home() {
  const { products, loading } = useProducts();

  // Filtrar productos destacados y activos
  const featuredProducts = products
    .filter(p => p.isActive && p.featured)
    .slice(0, 8); // Mostrar max 8 destacados

  return (
    <div className="bg-gray-50">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-emerald-800 via-emerald-700 to-green-900 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE0QzMyLjY5IDE0IDMwIDE2LjY5IDMwIDIwczIuNjkgNiA2IDYgNi0yLjY5IDYtNi0yLjY5LTYtNi02ek0zNiA0QzMyLjY5IDQgMzAgNi42OSAzMCAxMHMyLjY5IDYgNiA2IDYtMi42OSA2LTYtMi42OS02LTYtNnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-20"></div>
        <div className="relative max-w-7xl mx-auto px-4 py-16 md:py-24">
          <div className="max-w-2xl">
            <h2 className="text-4xl md:text-6xl font-bold mb-4 drop-shadow-lg">
              Bienvenido a <br />
              <span className="text-emerald-300">OLIVOMARKET</span>
            </h2>
            <p className="text-xl md:text-2xl mb-8 text-emerald-50">
              Los mejores productos venezolanos <br className="hidden sm:block" />
              al alcance de tu hogar
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/productos">
                <Button size="lg" className="bg-white text-emerald-700 hover:bg-emerald-50 shadow-xl border-none">
                  Ver Productos
                  <ChevronRight className="size-5 ml-2" />
                </Button>
              </Link>
              <Link href="/productos">
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                  Ofertas Especiales
                  <Star className="size-5 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 bg-white border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex items-start gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors">
              <div className="p-3 rounded-xl bg-emerald-100 text-emerald-600">
                <Truck className="size-6" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 mb-1">Envío Rápido</h3>
                <p className="text-sm text-gray-600">
                  Recibe tus productos en 24-48 horas
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors">
              <div className="p-3 rounded-xl bg-emerald-100 text-emerald-600">
                <Shield className="size-6" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 mb-1">Compra Segura</h3>
                <p className="text-sm text-gray-600">
                  Protección en todas tus transacciones
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors">
              <div className="p-3 rounded-xl bg-emerald-100 text-emerald-600">
                <Clock className="size-6" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 mb-1">Siempre Fresco</h3>
                <p className="text-sm text-gray-600">
                  Productos frescos y de calidad garantizada
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Productos Destacados */}
      <section className="py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 md:mb-8">Productos Destacados</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {featuredProducts.map((product) => (
              <div key={product.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                <Link href={`/productos/${product.slug}`}>
                  <div className="img-container square">
                    <Image
                      src={normalizeImageUrl(product.image)}
                      alt={product.name}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      className="w-full h-full object-cover object-center hover:scale-110 transition-transform duration-500"
                    />
                  </div>
                </Link>
                <div className="p-4">
                  <Link href={`/productos/${product.slug}`}>
                    <h3 className="text-lg font-medium text-gray-900 mb-2 line-clamp-1">{product.name}</h3>
                  </Link>
                  <p className="text-gray-500 mb-4">$ {product.price.toFixed(2)}</p>
                  <div className="flex gap-2">
                    <Link href={`/productos/${product.slug}`} className="flex-1">
                      <Button variant="outline" fullWidth className="text-sm px-2">Ver más</Button>
                    </Link>
                    <Button 
                      className="bg-emerald-600 hover:bg-emerald-500 flex-1 text-sm px-2"
                      onClick={(e) => {
                        e.preventDefault();
                        addToCart(
                          {
                            id: product.id,
                            name: product.name,
                            price: product.price,
                            image: product.image,
                            slug: product.slug,
                          },
                          1,
                        );
                        showToast(`¡${product.name} añadido al carrito!`, "success");
                      }}
                    >
                      Comprar
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 md:mt-10 text-center">
            <Link href="/productos">
              <Button variant="outline">
                Ver Todos
                <ChevronRight className="size-4 ml-1" />
              </Button>
            </Link>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {featuredProducts.length > 0 ? (
                featuredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={{
                      id: product.id,
                      name: product.name,
                      slug: product.slug || product.id,
                      price: product.price,
                      sale_price: product.priceOriginal,
                      image: product.image,
                      category: product.categories && product.categories[0] ? { name: product.categories[0] } : null,
                      featured: product.featured,
                      stock: product.stock
                    }}
                  />
                ))
              ) : (
                <div className="col-span-full text-center py-10 text-gray-500">
                  No hay productos destacados por el momento.
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="py-16 bg-gradient-to-br from-gray-900 to-gray-800 text-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <Heart className="size-12 mx-auto mb-4 text-emerald-400 animate-pulse" />
          <h2 className="text-3xl font-bold mb-3">
            Suscríbete a Nuestro Newsletter
          </h2>
          <p className="text-gray-300 mb-8 max-w-lg mx-auto">
            Recibe ofertas exclusivas y las últimas novedades directamente en tu correo. ¡No te pierdas nuestros descuentos especiales!
          </p>
          <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <Input
              type="email"
              placeholder="tu@email.com"
              className="flex-1 bg-white/10 border-white/20 text-white placeholder-gray-400 focus:ring-emerald-500 focus:border-emerald-500 rounded-xl"
            />
            <Button size="lg" className="sm:w-auto bg-emerald-600 hover:bg-emerald-500 border-none">
              Suscribirse
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
