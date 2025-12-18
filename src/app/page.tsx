"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import { normalizeImageUrl, getBannerImageUrl } from '@/utils/image';
import { useProducts } from "@/contexts/ProductContext";
import { useCategories as useCategoryHook } from "@/hooks/useCategories";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/contexts/ToastContext";

export default function Home() {
  const { products } = useProducts();
  const { categories } = useCategoryHook();
  const { addToCart } = useCart();
  const { showToast } = useToast();

  // Use real categories from API (with their own images)
  const featuredCategories = (categories || [])
    .filter((c: any) => c.isActive !== false)
    .slice(0, 8)
    .map((c: any, idx: number) => ({
      id: String(c.id ?? idx + 1),
      name: c.name,
      image: c.image,
      slug: c.slug || (c.name ? String(c.name).toLowerCase().replace(/[^a-z0-9]+/gi, '-') : String(idx + 1)),
    }));

  const featuredProducts = products
    .filter(p => p.featured && p.isActive !== false)
    .slice(0, 8);

  // Banner image state (comes from server settings)
  const [bannerImage, setBannerImage] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/settings');
        if (res.ok) {
          const settings = await res.json();
          // Prefer nested appearance.bannerUrl; fall back to legacy flat key
          const serverBanner = settings?.appearance?.bannerUrl || settings?.bannerUrl;
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
      <section className="relative bg-gradient-to-br from-emerald-800 via-emerald-700 to-amber-800 text-white banner-container">
        {/* Imagen de fondo (usa la imagen personalizada si existe). Si es personalizada usamos background-image para evitar restricciones de next/image */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          {bannerImage ? (
            <div
              className="absolute inset-0 w-full h-full bg-center bg-cover"
              style={{ 
                backgroundImage: `url(${getBannerImageUrl(bannerImage, 'large')})`,
                backgroundPosition: 'center 30%',
                backgroundSize: 'cover'
              }}
            />
          ) : (
            <Image
              src="https://images.unsplash.com/photo-1578662996442-48f60103fc96?q=80&w=1920&auto=format&fit=crop"
              alt="Minimarket venezolano con productos tradicionales"
              fill
              sizes="100vw"
              className="object-cover object-center"
              priority
            />
          )}
          {/* Overlay oscuro para mejorar legibilidad del texto */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/80 via-emerald-800/75 to-amber-900/70"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20 h-full flex items-center">
          <div className="md:w-2/3">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 md:mb-6 drop-shadow-lg">
              OLIVOMARKET
            </h1>
            <p className="text-lg md:text-xl mb-3 font-medium tracking-wide text-emerald-50 drop-shadow">
              &quot;como en casa pero más cerquita&quot;
            </p>
            <p className="text-base md:text-lg mb-6 md:mb-8 max-w-xl text-emerald-50/95 drop-shadow">
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
          </div>
        </div>

        {/* Overlay decorativo derecho */}
        <div className="absolute right-0 top-0 h-full w-1/3 bg-opacity-20 hidden lg:block z-10">
          <div className="h-full w-full bg-white/5 backdrop-blur-sm mix-blend-overlay"></div>
        </div>
      </section>

      {/* Categorías Destacadas */}
      <section className="py-12 md:py-16 bg-emerald-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 md:mb-8">Categorías</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {featuredCategories.map((category) => (
              <Link 
                key={category.id} 
                href={`/categorias/${category.slug}`}
                className="group overflow-hidden rounded-lg shadow-md transition-all hover:shadow-lg"
              >
                <div className="img-container wide">
                  <div className="absolute inset-0 bg-emerald-900/40 group-hover:bg-emerald-900/25 transition-all z-10"></div>
                  <Image
                    src={normalizeImageUrl(category.image)}
                    alt={category.name}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    className="w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-500"
                  />
                </div>
              </Link>
            ))}
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
                        addToCart({
                          id: product.id,
                          name: product.name,
                          price: product.price,
                          image: product.image,
                          slug: product.slug,
                        }, 1);
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
