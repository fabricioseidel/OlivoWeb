"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import { normalizeImageUrl } from '@/utils/image';
import { useProducts } from "@/contexts/ProductContext";

export default function Home() {
  const { products } = useProducts();

  const categoriesMap: Record<string, { image: string; count: number }> = {};
  products.forEach(p => {
    if (Array.isArray(p.categories)) {
      p.categories.forEach(cat => {
        if (!categoriesMap[cat]) {
          categoriesMap[cat] = {
            image: p.image || p.gallery?.[0] || "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=800&auto=format&fit=crop",
            count: 0
          };
        }
        categoriesMap[cat].count += 1;
      });
    }
  });
  const featuredCategories = Object.entries(categoriesMap)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 8)
    .map(([name, data], idx) => ({ id: String(idx + 1), name, image: data.image, slug: name.toLowerCase() }));

  const featuredProducts = products.filter(p => p.featured).slice(0, 8);

  // Banner image state (comes from server settings)
  const [bannerImage, setBannerImage] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/settings');
        if (res.ok) {
          const settings = await res.json();
          const serverBanner = settings?.appearance?.bannerUrl;
          if (serverBanner) setBannerImage(serverBanner);
        }
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  return (
    <div>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-emerald-800 via-emerald-700 to-amber-800 text-white overflow-hidden">
        {/* Imagen de fondo (usa la imagen personalizada si existe). Si es personalizada usamos background-image para evitar restricciones de next/image */}
        <div className="absolute inset-0 z-0">
          {bannerImage ? (
            <div
              className="absolute inset-0 w-full h-full bg-center bg-cover"
              style={{ backgroundImage: `url(${bannerImage})` }}
            />
          ) : (
            <Image
              src="https://images.unsplash.com/photo-1578662996442-48f60103fc96?q=80&w=1920&auto=format&fit=crop"
              alt="Minimarket venezolano con productos tradicionales"
              fill
              className="object-cover object-center"
              priority
            />
          )}
          {/* Overlay oscuro para mejorar legibilidad del texto */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/80 via-emerald-800/75 to-amber-900/70"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
          <div className="md:w-2/3">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 drop-shadow-lg">
              OLIVOMARKET
            </h1>
            <p className="text-xl mb-4 font-medium tracking-wide text-emerald-50 drop-shadow">
              &quot;como en casa pero más cerquita&quot;
            </p>
            <p className="text-lg mb-8 max-w-xl text-emerald-50/95 drop-shadow">
              Minimarket venezolano en Chile: víveres, quesos, cecinas, panes, helados y más sabores que te conectan con tu tierra.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/productos">
                <Button size="lg" className="bg-emerald-600 hover:bg-emerald-500 shadow-lg">Ver Productos</Button>
              </Link>
              <Link href="/ofertas">
                <Button variant="outline" size="lg" className="bg-transparent border-white text-white hover:bg-white/10 shadow-lg">
                  Ofertas
                </Button>
              </Link>
            </div>

            {/* Personalización disponible únicamente desde el panel de administrador (Apariencia) */}
          </div>
        </div>

        {/* Overlay decorativo derecho */}
        <div className="absolute right-0 top-0 h-full w-1/3 bg-opacity-20 hidden lg:block z-10">
          <div className="h-full w-full bg-white/5 backdrop-blur-sm mix-blend-overlay"></div>
        </div>
      </section>

      {/* Categorías Destacadas */}
      <section className="py-16 bg-emerald-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">Categorías</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredCategories.map((category) => (
              <Link 
                key={category.id} 
                href={`/categorias/${category.slug}`}
                className="group overflow-hidden rounded-lg shadow-md transition-all hover:shadow-lg"
              >
                <div className="relative h-48 overflow-hidden">
                  <div className="absolute inset-0 bg-emerald-900/40 group-hover:bg-emerald-900/25 transition-all z-10"></div>
                  <Image
                      src={normalizeImageUrl(category.image)}
                    alt={category.name}
                    fill
                    sizes="(max-width: 640px) 100vw, 25vw"
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 flex items-center justify-center z-20">
                    <h3 className="text-white text-xl font-bold drop-shadow">{category.name}</h3>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Productos Destacados */}
  <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <h2 className="text-3xl font-bold text-gray-900 mb-8">Productos Destacados</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts.map((product) => (
              <div key={product.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                <Link href={`/productos/${product.slug}`}>
                  <div className="h-48 overflow-hidden">
                    <div className="relative w-full h-full">
                      <Image
                        src={product.image}
                        alt={product.name}
                        fill
                        sizes="(max-width: 640px) 100vw, 25vw"
                        className="w-full h-full object-cover hover:scale-110 transition-transform duration-500"
                      />
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">{product.name}</h3>
                    <p className="text-gray-500 mb-4">$ {product.price.toFixed(2)}</p>
        <Button fullWidth className="bg-emerald-600 hover:bg-emerald-500">Ver detalle</Button>
                  </div>
                </Link>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link href="/productos">
      <Button variant="outline" size="lg" className="border-emerald-600 text-emerald-700 hover:bg-emerald-50">Ver Todos</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Sección de Ventajas */}
    <section className="py-16 bg-emerald-100/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">¿Por qué OLIVOMARKET?</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <div className="w-16 h-16 mx-auto bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">Envío Rápido</h3>
              <p className="text-gray-600">Recibe tus productos en tiempo récord con nuestro sistema de envío express.</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <div className="w-16 h-16 mx-auto bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">Garantía de Calidad</h3>
              <p className="text-gray-600">Todos nuestros productos cuentan con garantía y certificación de autenticidad.</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <div className="w-16 h-16 mx-auto bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">Pagos Seguros</h3>
              <p className="text-gray-600">Utiliza nuestros métodos de pago seguros y certificados para tu tranquilidad.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Sección de Suscripción al Newsletter */}
    <section className="py-16 bg-neutral-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
      <h2 className="text-3xl font-bold mb-4">Recibe ofertas y nuevos sabores</h2>
      <p className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto">Suscríbete y entérate primero de productos venezolanos recién llegados, promociones y más.</p>
          
          <form className="max-w-md mx-auto flex flex-col sm:flex-row gap-4">
            <input
              type="email"
              placeholder="Tu correo"
              className="flex-grow px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900"
              required
            />
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-500">Suscribirme</Button>
          </form>
        </div>
      </section>
    </div>
  );
}
