"use client";

import Link from "next/link";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { useProducts } from "@/contexts/ProductContext";
import { isProductVisible } from "@/services/products";
import ProductCard from "@/components/ProductCard";
import CategoryCard from "@/components/CategoryCard";
import HeroCarousel from "@/components/HeroCarousel";
import { useCategories } from "@/hooks/useCategories";
import {
  ChevronRight,
  Tag,
  Flame,
  Zap,
} from "lucide-react";

export default function Home() {
  const { products, loading: productsLoading } = useProducts();
  const { categories, loading: categoriesLoading } = useCategories();
  const { settings: storeSettings } = useStoreSettings();

  const visible = products.filter(p => p.isActive && isProductVisible(p));
  const featured = visible.filter(p => p.featured).sort((a, b) => a.name.localeCompare(b.name, "es"));
  const rest = visible.filter(p => !p.featured).sort((a, b) => a.name.localeCompare(b.name, "es"));
  const topSellers = [...featured, ...rest].slice(0, 10);
  const offerProducts = visible.filter(p => p.offerPrice && p.offerPrice < p.price).slice(0, 10);
  const moreProducts = [...featured, ...rest].slice(10, 20);

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* ── HERO BANNER ── */}
      {/* ── HERO BANNER (CAROUSEL) ── */}
      <HeroCarousel 
        blocks={storeSettings?.appearance?.blocks || []} 
        storeSettings={storeSettings} 
      />

      {/* ── CATEGORÍAS (horizontal) ── */}
      <section className="bg-white border-b border-gray-100 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-2 flex gap-2 overflow-x-auto scrollbar-hide">
          <Link href="/productos" className="shrink-0 px-4 py-1.5 rounded-full bg-emerald-600 text-white text-xs font-bold whitespace-nowrap hover:bg-emerald-500 transition-colors">
            Todo
          </Link>
          {!categoriesLoading && [...categories].sort((a, b) => a.name.localeCompare(b.name, "es")).map(cat => (
            <Link key={cat.id} href={`/productos?categoria=${cat.slug || cat.id}`}
              className="shrink-0 px-4 py-1.5 rounded-full bg-gray-100 hover:bg-emerald-50 hover:text-emerald-700 text-gray-700 text-xs font-bold whitespace-nowrap transition-colors">
              {cat.name}
            </Link>
          ))}
        </div>
      </section>

      {/* ── LO MÁS VENDIDO ── */}
      <ProductSection
        title="Lo más vendido"
        icon={<Flame className="w-5 h-5 text-orange-500" />}
        products={topSellers}
        loading={productsLoading}
        href="/productos"
      />

      {/* ── BANNER PROMOCIONAL ── */}
      <section className="py-4 px-4 max-w-7xl mx-auto">
        <Link href="/ofertas" className="block rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 p-6 md:p-8 relative overflow-hidden hover:opacity-95 transition-opacity">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-orange-600/40 to-transparent" />
          <p className="text-white/80 text-xs font-black uppercase tracking-widest mb-1">Tiempo limitado</p>
          <p className="text-white text-2xl md:text-4xl font-black leading-tight">Descuentos hasta<br /><span className="text-5xl md:text-6xl">40% OFF</span></p>
          <p className="text-white/70 text-sm mt-2">En productos seleccionados de toda la tienda</p>
          <span className="inline-flex items-center gap-1 mt-4 bg-white text-orange-600 font-black text-sm px-5 h-9 rounded-lg">
            Ver ofertas <ChevronRight className="w-4 h-4" />
          </span>
        </Link>
      </section>

      {/* ── OFERTAS ── */}
      {offerProducts.length > 0 && (
        <ProductSection
          title="Ofertas especiales"
          icon={<Tag className="w-5 h-5 text-red-500" />}
          products={offerProducts}
          loading={productsLoading}
          href="/ofertas"
        />
      )}

      {/* ── CATEGORÍAS VISUALES ── */}
      <section className="py-8 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <SectionHeader title="Nuestras categorías" icon={null} href="/productos" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {categoriesLoading
              ? Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-28 bg-gray-100 animate-pulse rounded-2xl" />)
              : [...categories].sort((a, b) => a.name.localeCompare(b.name, "es")).slice(0, 6).map(cat => (
                  <Link key={cat.id} href={`/productos?categoria=${cat.slug || cat.id}`}>
                    <CategoryCard category={{ ...cat, slug: cat.slug || cat.id, image: cat.image || null }} />
                  </Link>
                ))
            }
          </div>
          {categories.length > 6 && (
            <div className="text-center mt-4">
              <Link href="/categorias" className="inline-flex items-center gap-1 text-sm font-bold text-emerald-600 hover:text-emerald-700">
                Ver todas las categorías <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ── MÁS PRODUCTOS ── */}
      {moreProducts.length > 0 && (
        <ProductSection
          title="Más productos"
          icon={<Zap className="w-5 h-5 text-emerald-600" />}
          products={moreProducts}
          loading={productsLoading}
          href="/productos"
          bg="bg-white"
        />
      )}

      {/* ── VER TODOS ── */}
      <section className="py-10 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <Link href="/productos"
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-base px-10 h-14 rounded-xl transition-colors shadow-lg shadow-emerald-600/20">
            Ver todos los productos <ChevronRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}

/* ── Helpers ── */

function SectionHeader({ title, icon, href }: { title: string; icon: React.ReactNode; href: string }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-xl font-black text-gray-900">{title}</h2>
      </div>
      <Link href={href} className="text-sm font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
        Ver todos <ChevronRight className="w-4 h-4" />
      </Link>
    </div>
  );
}

function ProductSection({
  title,
  icon,
  products,
  loading,
  href,
  bg = "bg-gray-50",
}: {
  title: string;
  icon: React.ReactNode;
  products: any[];
  loading: boolean;
  href: string;
  bg?: string;
}) {
  return (
    <section className={`py-8 ${bg}`}>
      <div className="max-w-7xl mx-auto px-4">
        <SectionHeader title={title} icon={icon} href={href} />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {loading
            ? Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="h-64 bg-gray-100 animate-pulse rounded-2xl" />
              ))
            : products.map(product => (
                <ProductCard
                  key={product.id}
                  product={{ ...product, slug: product.slug || product.id, categories: product.categories || [] } as any}
                />
              ))
          }
        </div>
      </div>
    </section>
  );
}
