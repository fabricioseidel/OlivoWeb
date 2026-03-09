"use client";

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
      <section className="bg-gradient-to-br from-emerald-50/50 to-green-100/30 py-12 md:py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="max-w-2xl text-center md:text-left mx-auto md:mx-0">
            <h2 className="text-3xl md:text-5xl font-extrabold mb-4 text-emerald-950 tracking-tight leading-tight">
              Todo lo que necesitas, <br className="hidden sm:block" />
              en un <span className="text-emerald-600">solo lugar</span>
            </h2>
            <p className="text-base sm:text-lg md:text-xl mb-8 text-gray-600">
              Descubre nuestra amplia selección de productos venezolanos. Compra rápido y recibe en tu puerta con la mejor calidad garantizada.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center md:justify-start">
              <Link href="/productos">
                <Button size="lg" className="w-full sm:w-auto bg-emerald-600 text-white hover:bg-emerald-700 shadow-md">
                  Explorar productos
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link href="/productos">
                <Button size="lg" variant="outline" className="w-full sm:w-auto border-emerald-200 text-emerald-800 hover:bg-emerald-50">
                  Ver ofertas
                  <Star className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-10 md:py-16 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 xs:grid-cols-3 gap-4 md:gap-8">
            <div className="flex flex-col items-center justify-center text-center gap-3 p-6 rounded-2xl border border-gray-100 hover:border-emerald-200 hover:shadow-lg transition-all bg-white">
              <div className="w-14 h-14 rounded-full flex items-center justify-center bg-emerald-50 text-emerald-600">
                <Truck className="w-7 h-7" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Envío Rápido</h3>
                <p className="text-xs text-gray-500">
                  En 24-48 horas
                </p>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center text-center gap-3 p-6 rounded-2xl border border-gray-100 hover:border-emerald-200 hover:shadow-lg transition-all bg-white">
              <div className="w-14 h-14 rounded-full flex items-center justify-center bg-blue-50 text-blue-600">
                <Shield className="w-7 h-7" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Compra Segura</h3>
                <p className="text-xs text-gray-500">
                  Pagos protegidos
                </p>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center text-center gap-3 p-6 rounded-2xl border border-gray-100 hover:border-emerald-200 hover:shadow-lg transition-all bg-white">
              <div className="w-14 h-14 rounded-full flex items-center justify-center bg-orange-50 text-orange-600">
                <Clock className="w-7 h-7" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Siempre Fresco</h3>
                <p className="text-xs text-gray-500">
                  Calidad garantizada
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Productos Destacados */}
      <section className="py-12 md:py-16 bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-6 md:mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Productos Destacados</h2>
            <Link href="/productos" className="text-sm font-medium text-emerald-600 hover:text-emerald-700 hover:underline hidden sm:block">
              Ver todos
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
                      offerPrice: product.offerPrice,
                      image: product.image,
                      categories: product.categories || [],
                      description: product.description || "",
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
              className="flex-1 bg-white/10 border-white/20 text-white placeholder-gray-400 focus:ring-emerald-500 focus:border-emerald-500 rounded-xl min-h-[48px]"
            />
            <Button size="lg" className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 border-none min-h-[48px]">
              Suscribirse
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
