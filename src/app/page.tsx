"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { useProducts } from "@/contexts/ProductContext";
import { isProductVisible } from "@/services/products";
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
  ShoppingBag,
  ArrowRight,
  Sparkles,
  Users,
  BadgeCheck,
  Zap,
  Package,
} from "lucide-react";

export default function Home() {
  const { products, loading: productsLoading } = useProducts();
  const { categories, loading: categoriesLoading } = useCategories();
  const { status } = useSession();
  const { settings: storeSettings, loading: settingsLoading } = useStoreSettings();

  const heroTitle = storeSettings?.heroTitle || "Sabor que te conecta con casa";
  const heroDescription = storeSettings?.heroDescription || "Llevamos lo mejor de Venezuela directo a tu puerta en Chile. Calidad garantizada, frescura y el sabor que ya conoces.";

  const featuredProducts = products
    .filter(p => p.isActive && p.featured && isProductVisible(p))
    .slice(0, 8);

  const allActiveProducts = products
    .filter(p => p.isActive && isProductVisible(p));

  const blocks = storeSettings?.appearance?.blocks?.filter(b => b.enabled) ?? [];
  const hasBlocks = blocks.length > 0;

  const renderHero = (title: string, description: string, subtitle?: string, buttonText?: string, buttonLink?: string) => (
    <section className="relative overflow-hidden bg-emerald-950">
      {/* Fondos decorativos */}
      <div className="absolute top-0 right-0 -translate-y-1/3 translate-x-1/3 w-[700px] h-[700px] bg-emerald-500/20 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 pt-20 pb-0 md:pt-28 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-end">
          {/* Texto */}
          <div className="text-center lg:text-left pb-16 md:pb-20">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-emerald-400 text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] mb-7 animate-in fade-in slide-in-from-top duration-700">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{subtitle || "Productos venezolanos premium"}</span>
            </div>

            {/* Título */}
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-black mb-6 text-white tracking-tighter leading-[0.92] whitespace-pre-line animate-in fade-in slide-in-from-bottom duration-700 delay-100">
              {title}
            </h1>

            {/* Descripción */}
            <p className="text-base md:text-xl mb-10 text-emerald-100/60 max-w-lg mx-auto lg:mx-0 leading-relaxed font-medium animate-in fade-in duration-700 delay-200">
              {description}
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-12 animate-in fade-in duration-700 delay-300">
              <Link href={buttonLink || "/productos"}>
                <Button size="lg" className="w-full sm:w-auto bg-emerald-500 text-white hover:bg-emerald-400 border-none shadow-[0_20px_40px_rgba(16,185,129,0.35)] transition-all hover:scale-105 active:scale-95 px-10 h-14 rounded-2xl text-base font-black">
                  {buttonText || "Comprar Ahora"}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link href="/ofertas">
                <Button size="lg" className="w-full sm:w-auto bg-white/10 text-white hover:bg-white/20 border border-white/20 h-14 rounded-2xl px-8 text-base font-black backdrop-blur-sm transition-all active:scale-95">
                  Ver Ofertas
                  <Zap className="w-4 h-4 ml-2 text-amber-400" />
                </Button>
              </Link>
            </div>

            {/* Social proof */}
            <div className="flex items-center gap-6 justify-center lg:justify-start animate-in fade-in duration-700 delay-500">
              <div className="flex -space-x-2">
                {["E","C","M","L"].map((l, i) => (
                  <div key={i} className="w-8 h-8 rounded-full bg-emerald-700 border-2 border-emerald-950 flex items-center justify-center text-[10px] font-black text-emerald-200">{l}</div>
                ))}
              </div>
              <div>
                <div className="flex items-center gap-1 mb-0.5">
                  {[1,2,3,4,5].map(s => <Star key={s} className="w-3 h-3 fill-amber-400 text-amber-400" />)}
                </div>
                <p className="text-[11px] text-emerald-400/70 font-bold">+2,400 clientes satisfechos</p>
              </div>
            </div>
          </div>

          {/* Panel derecho — tarjetas flotantes */}
          <div className="relative hidden lg:flex items-end justify-center h-[420px]">
            {/* Tarjeta principal — producto destacado */}
            <div className="absolute top-8 left-4 bg-white/10 backdrop-blur-2xl border border-white/15 rounded-[2rem] p-5 shadow-2xl w-52 animate-in fade-in slide-in-from-left duration-700 delay-300">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center mb-3">
                <Package className="w-5 h-5 text-emerald-400" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400/60 mb-1">Envío express</p>
              <p className="text-sm font-black text-white">Llega en 24-48h</p>
            </div>

            {/* Tarjeta central — oferta */}
            <Link href="/ofertas" className="absolute top-1/2 -translate-y-1/2 right-0 bg-amber-500/20 backdrop-blur-2xl border border-amber-400/30 rounded-[2rem] p-5 shadow-2xl w-56 animate-in fade-in slide-in-from-right duration-700 delay-400 hover:bg-amber-500/30 transition-all">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center shadow">
                  <Star className="w-4 h-4 fill-white text-white" />
                </div>
                <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">OFERTAS TOP</span>
              </div>
              <p className="text-xs font-bold text-white/70">Descuentos hasta</p>
              <p className="text-3xl font-black text-amber-400">40% OFF</p>
            </Link>

            {/* Tarjeta inferior — satisfacción */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-2xl border border-white/15 rounded-[2rem] p-4 shadow-2xl flex items-center gap-3 w-60 animate-in fade-in slide-in-from-bottom duration-700 delay-500">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center shrink-0">
                <BadgeCheck className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400/60">Garantía total</p>
                <p className="text-sm font-black text-white">100% satisfecho</p>
              </div>
            </div>

            {/* Decorativo: ShoppingBag de fondo */}
            <ShoppingBag className="w-64 h-64 text-emerald-400/5 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-12" />
          </div>
        </div>
      </div>

      {/* Barra de beneficios */}
      <div className="border-t border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-0 md:divide-x md:divide-white/10">
            {[
              { icon: Truck,       text: "Envío en 24-48h" },
              { icon: BadgeCheck,  text: "Calidad garantizada" },
              { icon: Shield,      text: "Pago 100% seguro" },
              { icon: Users,       text: "+2,400 clientes" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center justify-center gap-2 px-4 py-1">
                <Icon className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-[11px] font-bold text-emerald-100/70 uppercase tracking-wider">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );

  const renderCategories = (title: string, description: string) => (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-4">
          <div>
            <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-1">{title}</h2>
            <p className="text-gray-500 font-medium">{description}</p>
          </div>
          <Link href="/productos" className="inline-flex items-center gap-1 text-sm font-black text-emerald-600 hover:text-emerald-700 transition-colors shrink-0">
            Ver todas <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {categoriesLoading
            ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-64 bg-gray-100 animate-pulse rounded-[3rem]" />)
            : categories.slice(0, 4).map(cat => (
                <Link key={cat.id} href={`/productos?categoria=${cat.slug || cat.id}`}>
                  <CategoryCard category={{ ...cat, slug: cat.slug || cat.id, image: cat.image || null }} />
                </Link>
              ))
          }
        </div>
      </div>
    </section>
  );

  const renderProducts = (title: string, description: string, limit: number) => {
    const items = products.filter(p => p.isActive && p.featured && isProductVisible(p)).slice(0, limit);
    return (
      <section className="py-16 bg-gray-50/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-10">
            <div>
              <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-1">{title}</h2>
              <p className="text-gray-500 font-medium">{description}</p>
            </div>
            <Link href="/productos" className="hidden sm:inline-flex items-center gap-1 text-sm font-black text-emerald-600 hover:text-emerald-700 transition-colors shrink-0">
              Ver todos <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {productsLoading
              ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-72 bg-gray-100 animate-pulse rounded-[2rem]" />)
              : items.map(product => (
                  <ProductCard key={product.id} product={{ ...product, slug: product.slug || product.id, categories: product.categories || [] } as any} />
                ))
            }
          </div>
          {items.length > 0 && (
            <div className="text-center mt-10">
              <Link href="/productos">
                <Button size="lg" className="bg-white border-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-400 rounded-2xl px-10 h-14 font-black transition-all active:scale-95 shadow-sm">
                  Ver todos los productos
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>
          )}
        </div>
      </section>
    );
  };

  const renderFeatures = () => (
    <section className="py-20 bg-white border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-2">¿Por qué elegir OlivoMarket?</h2>
          <p className="text-gray-500 font-medium max-w-xl mx-auto">Todo lo que necesitas para recibir lo mejor de Venezuela en tu puerta</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 md:gap-8">
          {[
            { icon: Truck,   bg: "bg-emerald-50", hover: "group-hover:bg-emerald-600", color: "text-emerald-600 group-hover:text-white", title: "Envío Veloz", desc: "Recibe tus productos en 24-48 horas con nuestro servicio logístico express." },
            { icon: Shield,  bg: "bg-blue-50",    hover: "group-hover:bg-blue-600",    color: "text-blue-600 group-hover:text-white",    title: "Pago Seguro",    desc: "Transacciones protegidas con encriptación de nivel bancario en todo momento." },
            { icon: Clock,   bg: "bg-orange-50",  hover: "group-hover:bg-orange-600",  color: "text-orange-600 group-hover:text-white",  title: "Siempre Fresco",  desc: "Productos seleccionados con los más altos estándares de calidad y frescura." },
          ].map(({ icon: Icon, bg, hover, color, title, desc }) => (
            <div key={title} className="group bg-gray-50 rounded-[2rem] p-8 border border-gray-100 hover:border-transparent hover:shadow-xl transition-all duration-300 text-center">
              <div className={`w-20 h-20 rounded-2xl flex items-center justify-center ${bg} ${hover} mx-auto mb-6 transition-all duration-300`}>
                <Icon className={`w-9 h-9 ${color} transition-colors duration-300`} />
              </div>
              <h3 className="text-xl font-black text-gray-900 mb-3 tracking-tight">{title}</h3>
              <p className="text-gray-500 font-medium leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        {/* Garantía */}
        <div className="mt-12 bg-emerald-50 border border-emerald-100 rounded-[2rem] p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
          <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center shrink-0">
            <BadgeCheck className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1">
            <h4 className="text-xl font-black text-gray-900 mb-1">Garantía de satisfacción 100%</h4>
            <p className="text-gray-500 font-medium">Si no estás satisfecho con tu compra, te devolvemos el dinero. Sin preguntas, sin complicaciones.</p>
          </div>
          <Link href="/productos" className="shrink-0">
            <Button className="bg-emerald-600 text-white hover:bg-emerald-700 border-none rounded-2xl px-8 h-12 font-black shadow-lg shadow-emerald-500/20 transition-all active:scale-95">
              Comprar ahora
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );

  const renderNewsletter = (title: string, description: string) => (
    <section className="py-20 bg-gradient-to-br from-emerald-950 to-black text-white relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[120px] -mr-20 -mt-20 pointer-events-none" />
      <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-emerald-400 text-[10px] font-black uppercase tracking-[0.2em] mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Oferta exclusiva</span>
        </div>
        <h2 className="text-3xl md:text-5xl font-black mb-4 tracking-tight">{title}</h2>
        <p className="text-emerald-100/60 mb-3 max-w-xl mx-auto text-lg font-medium">{description}</p>
        <p className="text-emerald-400 font-black text-sm uppercase tracking-widest mb-10">🎁 10% OFF en tu primera compra al suscribirte</p>
        <NewsletterForm />
        <p className="text-xs text-white/30 mt-6 font-medium">Sin spam. Puedes darte de baja cuando quieras.</p>
      </div>
    </section>
  );

  return (
    <div className="bg-white">
      {hasBlocks ? (
        blocks.map((block) => {
          switch (block.type) {
            case 'hero':
              return <div key={block.id}>{renderHero(block.title || heroTitle, block.description || heroDescription, block.subtitle, block.buttonText, block.buttonLink)}</div>;
            case 'categories':
              return <div key={block.id}>{renderCategories(block.title || "Nuestras Categorías", block.description || "Encuentra exactamente lo que buscas")}</div>;
            case 'products':
              return <div key={block.id}>{renderProducts(block.title || "Lo Más Vendido", block.description || "Los favoritos de nuestra comunidad", block.itemsToShow || 8)}</div>;
            case 'features':
              return <div key={block.id}>{renderFeatures()}</div>;
            case 'newsletter':
              return <div key={block.id}>{renderNewsletter(block.title || "Únete a la familia Olivo Market", block.description || "Recibe ofertas exclusivas y un 10% de descuento en tu primera compra.")}</div>;
            default: return null;
          }
        })
      ) : (
        <>
          {renderHero(heroTitle, heroDescription)}
          {renderCategories("Nuestras Categorías", "Encuentra exactamente lo que buscas")}
          {renderProducts("Lo Más Vendido", "Los favoritos de nuestra comunidad", 8)}
          {renderFeatures()}
          {renderNewsletter("Únete a la familia Olivo Market", "Recibe ofertas exclusivas y un 10% de descuento en tu primera compra.")}
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
        showToast("¡Gracias por suscribirte! Revisa tu email.", "success");
        setEmail("");
      } else {
        const data = await res.json();
        showToast(data.error || "Error al suscribirse", "error");
      }
    } catch {
      showToast("Hubo un problema al conectar con el servidor", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
      <Input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="tu@email.com"
        className="flex-1 bg-white/10 border-white/20 text-white placeholder-white/30 focus:ring-emerald-500 focus:border-emerald-500 rounded-2xl min-h-[52px] px-6"
      />
      <Button
        type="submit"
        size="lg"
        loading={loading}
        className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 border-none min-h-[52px] px-8 rounded-2xl font-black shadow-lg shadow-emerald-900/20 transition-all active:scale-95"
      >
        Suscribirme
      </Button>
    </form>
  );
}
