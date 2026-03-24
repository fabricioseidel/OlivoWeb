"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import type { StoreSettings } from "@/app/api/admin/settings/route";
import Link from "next/link";
import { useProducts } from "@/contexts/ProductContext";
import { useToast } from "@/contexts/ToastContext";
import ProductCard from "@/components/ProductCard";
import CategoryCard from "@/components/CategoryCard";
import { useCategories } from "@/hooks/useCategories";
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
  const { products, loading: productsLoading } = useProducts();
  const { categories, loading: categoriesLoading } = useCategories();
  const { status } = useSession();
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);

  // Load settings for dynamic hero content
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch('/api/admin/settings');
        if (res.ok) setStoreSettings(await res.json());
      } catch (e) { console.error(e); }
    };
    loadSettings();
  }, []);

  const heroTitle = storeSettings?.heroTitle || "Sabor que te conecta con casa";
  const heroDescription = storeSettings?.heroDescription || "Llevamos lo mejor de Venezuela directo a tu puerta en Chile. Calidad garantizada, frescura y el sabor que ya conoces.";
  const isLoggedIn = status === "authenticated";

  // Filtrar productos destacados y activos
  const featuredProducts = products
    .filter(p => p.isActive && p.featured)
    .slice(0, 8); // Mostrar max 8 destacados

  return (
    <div className="bg-white">
      {/* Dynamic Sections via Page Builder */}
      {storeSettings?.appearance?.blocks && storeSettings.appearance.blocks.length > 0 ? (
        storeSettings.appearance.blocks.filter(b => b.enabled).map((block, index) => {
          switch (block.type) {
            case 'hero':
              return (
                <section key={block.id} className="relative overflow-hidden bg-emerald-950 pt-24 pb-24 md:pt-32 md:pb-40">
                  <div className="absolute top-0 right-0 -translate-y-1/3 translate-x-1/3 w-[600px] h-[600px] bg-emerald-500/30 rounded-full blur-[120px] pointer-events-none animate-pulse duration-[10s]" />
                  <div className="absolute top-1/2 left-0 -translate-y-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-[100px] pointer-events-none" />
                  <div className="max-w-7xl mx-auto px-4 relative z-10">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                      <div className="text-center lg:text-left">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-emerald-400 text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] mb-8 animate-in fade-in slide-in-from-top duration-700">
                          <Sparkles className="w-4 h-4" />
                          <span>{block.subtitle || "Productos venezolanos premium"}</span>
                        </div>
                        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black mb-8 text-white tracking-tighter leading-[0.95] md:leading-[1] whitespace-pre-line">
                          {block.title || heroTitle}
                        </h1>
                        <p className="text-lg md:text-2xl mb-12 text-emerald-100/70 max-w-xl mx-auto lg:mx-0 leading-relaxed font-medium">
                          {block.description || heroDescription}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-5 justify-center lg:justify-start">
                          <Link href={block.buttonLink || "/productos"}>
                            <Button size="lg" className="w-full sm:w-auto bg-emerald-500 text-white hover:bg-emerald-400 border-none shadow-[0_20px_40px_rgba(16,185,129,0.3)] transition-all hover:scale-105 active:scale-95 px-10 h-16 rounded-2xl text-lg font-black">
                              {block.buttonText || "Comprar Ahora"}
                              <ArrowRight className="w-6 h-6 ml-2" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                      <div className="relative group">
                          <div className="relative aspect-square sm:aspect-[4/3] rounded-[3rem] overflow-hidden bg-gradient-to-br from-emerald-800 to-emerald-950 border border-white/10 shadow-2xl transition-all duration-700">
                            <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none">
                              <ShoppingBag className="w-48 h-48 sm:w-64 sm:h-64 text-emerald-400/20 rotate-12" />
                            </div>
                            <Link href="/ofertas" className="absolute bottom-[18%] right-[10%] bg-amber-900/40 backdrop-blur-2xl p-4 sm:p-6 rounded-[2rem] border border-white/10 shadow-2xl animate-float transition-all z-30 group/star block">
                              <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full bg-amber-400 flex items-center justify-center shadow-lg"><Star className="text-white w-5 h-5 fill-white" /></div>
                                <div className="text-[10px] font-black text-amber-400 uppercase tracking-widest">OFERTAS TOP</div>
                              </div>
                            </Link>
                          </div>
                      </div>
                    </div>
                  </div>
                </section>
              );
            case 'categories':
              return (
                <section key={block.id} className="py-16 bg-white">
                  <div className="max-w-7xl mx-auto px-4 text-center sm:text-left">
                    <div className="flex flex-col sm:flex-row justify-between items-center mb-10 gap-4">
                      <div>
                        <h2 className="text-3xl font-bold text-gray-900 mb-2">{block.title || "Nuestras Categorías"}</h2>
                        <p className="text-gray-500">{block.description || "Encuentra exactamente lo que buscas en segundos"}</p>
                      </div>
                      <Link href="/productos" className="text-emerald-600 font-semibold hover:underline flex items-center gap-1">
                        Ver todas <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                      {categoriesLoading ? (
                        Array.from({ length: 4 }).map((_, i) => (
                          <div key={i} className="h-64 bg-gray-50 animate-pulse rounded-[3rem]" />
                        ))
                      ) : categories && categories.slice(0, 4).map((cat) => (
                        <Link key={cat.id} href={`/productos?categoria=${cat.slug || cat.id}`}>
                          <CategoryCard category={{...cat, slug: cat.slug || cat.id, image: cat.image || null}} />
                        </Link>
                      ))}
                    </div>
                  </div>
                </section>
              );
            case 'products':
              const limit = block.itemsToShow || 8;
              const productsToDisplay = products.filter(p => p.isActive && p.featured).slice(0, limit);
              return (
                <section key={block.id} className="py-16 bg-gray-50/50">
                  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-end justify-between mb-10">
                      <div>
                        <h2 className="text-3xl font-bold text-gray-900 mb-2">{block.title || "Lo Más Vendido"}</h2>
                        <p className="text-gray-500">{block.description || "Los favoritos de nuestra comunidad"}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                      {productsToDisplay.map((product) => (
                        <ProductCard key={product.id} product={{...product, slug: product.slug || product.id, categories: product.categories || []} as any} />
                      ))}
                    </div>
                  </div>
                </section>
              );
            case 'features':
              return (
                <section key={block.id} className="py-20 bg-white border-t border-gray-100">
                  <div className="max-w-7xl mx-auto px-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 md:gap-12">
                      <div className="flex flex-col items-center text-center group">
                        <div className="w-20 h-20 rounded-full flex items-center justify-center bg-emerald-50 text-emerald-600 mb-6 group-hover:bg-emerald-600 group-hover:text-white transition-all"><Truck className="w-10 h-10" /></div>
                        <h3 className="text-xl font-bold text-gray-900 mb-3">Envío Veloz</h3>
                        <p className="text-gray-500 max-w-xs">{block.description || "Recibe tus productos en menos de 48 horas con nuestro servicio logístico."}</p>
                      </div>
                      <div className="flex flex-col items-center text-center group">
                        <div className="w-20 h-20 rounded-full flex items-center justify-center bg-blue-50 text-blue-600 mb-6 group-hover:bg-blue-600 group-hover:text-white transition-all"><Shield className="w-10 h-10" /></div>
                        <h3 className="text-xl font-bold text-gray-900 mb-3">Seguridad Total</h3>
                        <p className="text-gray-500 max-w-xs">Tus datos y pagos están protegidos con encriptación de nivel bancario.</p>
                      </div>
                      <div className="flex flex-col items-center text-center group">
                        <div className="w-20 h-20 rounded-full flex items-center justify-center bg-orange-50 text-orange-600 mb-6 group-hover:bg-orange-600 group-hover:text-white transition-all"><Clock className="w-10 h-10" /></div>
                        <h3 className="text-xl font-bold text-gray-900 mb-3">Siempre Fresco</h3>
                        <p className="text-gray-500 max-w-xs">Garantizamos que cada producto llegue a tu mesa con la máxima calidad.</p>
                      </div>
                    </div>
                  </div>
                </section>
              );
            case 'newsletter':
              return (
                <section key={block.id} className="py-20 bg-gradient-to-br from-gray-900 to-black text-white relative overflow-hidden">
                  <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
                    <Heart className="size-16 mx-auto mb-6 text-emerald-500/20 fill-emerald-500/10 animate-pulse" />
                    <h2 className="text-3xl md:text-4xl font-black mb-4 tracking-tight">{block.title || "Únete a la familia Olivo Market"}</h2>
                    <p className="text-gray-400 mb-10 max-w-xl mx-auto text-lg">{block.description || "Recibe ofertas exclusivas y un 10% de descuento en tu primera compra."}</p>
                    <NewsletterForm />
                  </div>
                </section>
              );
            default: return null;
          }
        })
      ) : (
        <>
          {/* Fallback original content as default if no blocks are configured */}
          <section className="relative overflow-hidden bg-emerald-950 pt-24 pb-24 md:pt-32 md:pb-40">
            {/* ... original hero content ... */}
            <div className="max-w-7xl mx-auto px-4 relative z-10">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                <div className="text-center lg:text-left">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-emerald-400 text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] mb-8 animate-in fade-in slide-in-from-top duration-700">
                    <Sparkles className="w-4 h-4" />
                    <span>Productos venezolanos premium</span>
                  </div>
                  <h1 className="text-5xl md:text-7xl lg:text-8xl font-black mb-8 text-white tracking-tighter leading-[0.95] md:leading-[1] whitespace-pre-line">
                    {heroTitle}
                  </h1>
                  <p className="text-lg md:text-2xl mb-12 text-emerald-100/70 max-w-xl mx-auto lg:mx-0 leading-relaxed font-medium">
                    {heroDescription}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-5 justify-center lg:justify-start">
                    <Link href="/productos" className="w-full sm:w-auto">
                      <Button size="lg" className="w-full sm:w-auto bg-emerald-500 text-white hover:bg-emerald-400 border-none shadow-[0_20px_40px_rgba(16,185,129,0.3)] transition-all hover:scale-105 active:scale-95 px-10 h-16 rounded-2xl text-lg font-black">
                        Comprar Ahora
                        <ArrowRight className="w-6 h-6 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="py-16 bg-white">
            <div className="max-w-7xl mx-auto px-4 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row justify-between items-center mb-10 gap-4">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">Nuestras Categorías</h2>
                  <p className="text-gray-500">Encuentra exactamente lo que buscas en segundos</p>
                </div>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {categoriesLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-64 bg-gray-50 animate-pulse rounded-[3rem]" />
                  ))
                ) : categories && categories.slice(0, 4).map((cat) => (
                  <Link key={cat.id} href={`/productos?categoria=${cat.slug || cat.id}`}>
                    <CategoryCard category={{...cat, slug: cat.slug || cat.id, image: cat.image || null}} />
                  </Link>
                ))}
              </div>
            </div>
          </section>

          <section className="py-16 bg-gray-50/50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-end justify-between mb-10">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">Lo Más Vendido</h2>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
               {featuredProducts.map((product) => (
                  <ProductCard key={product.id} product={{...product, slug: product.slug || product.id, categories: product.categories || []} as any} />
                ))}
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      showToast("Por favor, ingresa un email válido", "error");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "homepage_footer" }),
      });

      if (res.ok) {
        showToast("¡Gracias por suscribirte!", "success");
        setEmail("");
      } else {
        const data = await res.json();
        showToast(data.error || "Error al suscribirse", "error");
      }
    } catch (err) {
      showToast("Hubo un problema al conectar con el servidor", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
      <Input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="tu@email.com"
        className="flex-1 bg-white/5 border-white/10 text-white placeholder-gray-500 focus:ring-emerald-500 focus:border-emerald-500 rounded-2xl min-h-[56px] px-6"
      />
      <Button 
        type="submit"
        size="lg" 
        loading={loading}
        className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 border-none min-h-[56px] px-8 rounded-2xl shadow-lg shadow-emerald-900/20"
      >
        Suscribirme
      </Button>
    </form>
  );
}
