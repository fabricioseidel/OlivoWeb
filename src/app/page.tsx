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
  Heart,
  Apple,
  Home as HomeIcon,
  PawPrint,
  ShoppingBag,
  ArrowRight,
  Sparkles
} from "lucide-react";

export default function Home() {
  const { products, loading } = useProducts();

  // Filtrar productos destacados y activos
  const featuredProducts = products
    .filter(p => p.isActive && p.featured)
    .slice(0, 8); // Mostrar max 8 destacados

  return (
    <div className="bg-white">
      {/* Hero Section - Rediseñado para ser más llamativo y premium */}
      <section className="relative overflow-hidden bg-emerald-950 pt-16 pb-20 md:pt-24 md:pb-32">
        {/* Decoración de fondo */}
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-[500px] h-[500px] bg-emerald-500/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium mb-6">
                <Sparkles className="w-4 h-4" />
                <span>Productos venezolanos premium</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-black mb-6 text-white tracking-tight leading-[1.1]">
                Sabor que te <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-green-300">
                  conecta con casa
                </span>
              </h1>
              <p className="text-lg md:text-xl mb-10 text-emerald-100/80 max-w-xl mx-auto lg:mx-0">
                Llevamos lo mejor de Venezuela directo a tu puerta. Calidad garantizada, frescura y el sabor que ya conoces.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link href="/productos">
                  <Button size="lg" className="w-full sm:w-auto bg-emerald-500 text-white hover:bg-emerald-400 border-none shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all hover:scale-105 active:scale-95 px-8">
                    Comprar Ahora
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
                <Link href="/ofertas">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto border-emerald-500/30 text-emerald-100 hover:bg-emerald-500/10 hover:border-emerald-500/50">
                    Ver Ofertas
                    <Star className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Imagen/Gráfico Lado Derecho (Placeholder estilizado) */}
            <div className="hidden lg:block relative">
              <div className="relative aspect-[4/3] rounded-3xl overflow-hidden bg-gradient-to-br from-emerald-800 to-emerald-900 border border-emerald-500/20 shadow-2xl">
                <div className="absolute inset-0 flex items-center justify-center opacity-30">
                  <ShoppingBag className="w-48 h-48 text-emerald-400/20" />
                </div>
                {/* Elementos flotantes simulando productos o interfaz */}
                <div className="absolute top-10 right-10 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 animate-bounce transition-all duration-3000">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center mb-2">
                    <Truck className="text-white w-6 h-6" />
                  </div>
                  <div className="h-2 w-16 bg-white/20 rounded-full mb-1" />
                  <div className="h-2 w-10 bg-white/10 rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categorías - Subido para dar acción inmediata */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-10 gap-4">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Nuestras Categorías</h2>
              <p className="text-gray-500">Encuentra exactamente lo que buscas en segundos</p>
            </div>
            <Link href="/categorias" className="text-emerald-600 font-semibold hover:underline flex items-center gap-1">
              Ver todas <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <Link href="/productos?categoria=alimentos" className="group flex flex-col items-center justify-center p-8 bg-gray-50 rounded-3xl hover:bg-emerald-50 transition-all border border-transparent hover:border-emerald-100">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center bg-white shadow-sm text-emerald-600 mb-4 group-hover:scale-110 transition-transform">
                <Apple className="w-10 h-10" />
              </div>
              <span className="text-lg font-bold text-gray-900">Alimentos</span>
            </Link>

            <Link href="/productos?categoria=hogar" className="group flex flex-col items-center justify-center p-8 bg-gray-50 rounded-3xl hover:bg-blue-50 transition-all border border-transparent hover:border-blue-100">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center bg-white shadow-sm text-blue-600 mb-4 group-hover:scale-110 transition-transform">
                <HomeIcon className="w-10 h-10" />
              </div>
              <span className="text-lg font-bold text-gray-900">Hogar</span>
            </Link>

            <Link href="/productos?categoria=mascotas" className="group flex flex-col items-center justify-center p-8 bg-gray-50 rounded-3xl hover:bg-orange-50 transition-all border border-transparent hover:border-orange-100">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center bg-white shadow-sm text-orange-600 mb-4 group-hover:scale-110 transition-transform">
                <PawPrint className="w-10 h-10" />
              </div>
              <span className="text-lg font-bold text-gray-900">Mascotas</span>
            </Link>

            <Link href="/productos?categoria=conveniencia" className="group flex flex-col items-center justify-center p-8 bg-gray-50 rounded-3xl hover:bg-purple-50 transition-all border border-transparent hover:border-purple-100">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center bg-white shadow-sm text-purple-600 mb-4 group-hover:scale-110 transition-transform">
                <ShoppingBag className="w-10 h-10" />
              </div>
              <span className="text-lg font-bold text-gray-900">Conveniencia</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Productos Destacados */}
      <section className="py-16 bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-10">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Lo Más Vendido</h2>
              <p className="text-gray-500">Los favoritos de nuestra comunidad</p>
            </div>
            <Link href="/productos" className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 hover:underline hidden sm:block">
              Ver catálogo completo
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

      {/* Features Section - Movido aquí abajo y hecho más premium/compacto */}
      <section className="py-20 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 md:gap-12">
            <div className="flex flex-col items-center text-center group">
              <div className="w-20 h-20 rounded-full flex items-center justify-center bg-emerald-50 text-emerald-600 mb-6 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300">
                <Truck className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Envío Veloz</h3>
              <p className="text-gray-500 max-w-xs">
                Recibe tus productos en la comodidad de tu hogar en menos de 48 horas con nuestro servicio logístico.
              </p>
            </div>

            <div className="flex flex-col items-center text-center group">
              <div className="w-20 h-20 rounded-full flex items-center justify-center bg-blue-50 text-blue-600 mb-6 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                <Shield className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Seguridad Total</h3>
              <p className="text-gray-500 max-w-xs">
                Tus datos y pagos están protegidos con los más altos estándares de encriptación y seguridad digital.
              </p>
            </div>

            <div className="flex flex-col items-center text-center group">
              <div className="w-20 h-20 rounded-full flex items-center justify-center bg-orange-50 text-orange-600 mb-6 group-hover:bg-orange-600 group-hover:text-white transition-all duration-300">
                <Clock className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Siempre Fresco</h3>
              <p className="text-gray-500 max-w-xs">
                Seleccionamos cada producto rigurosamente para garantizar que llegue a tu mesa con la máxima calidad.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="py-20 bg-gradient-to-br from-gray-900 to-black text-white relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-blue-500" />
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          <Heart className="size-16 mx-auto mb-6 text-emerald-500/20 fill-emerald-500/10 animate-pulse" />
          <h2 className="text-3xl md:text-4xl font-black mb-4 tracking-tight">
            Únete a la familia Olivo Market
          </h2>
          <p className="text-gray-400 mb-10 max-w-xl mx-auto text-lg">
            Recibe ofertas exclusivas y un 10% de descuento en tu primera compra al suscribirte.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <Input
              type="email"
              placeholder="tu@email.com"
              className="flex-1 bg-white/5 border-white/10 text-white placeholder-gray-500 focus:ring-emerald-500 focus:border-emerald-500 rounded-2xl min-h-[56px] px-6"
            />
            <Button size="lg" className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 border-none min-h-[56px] px-8 rounded-2xl shadow-lg shadow-emerald-900/20">
              Suscribirme
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
