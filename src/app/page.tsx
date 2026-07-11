import type { Metadata } from "next";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase-server";
import { fetchAllProducts, isProductVisible } from "@/services/products";
import type { ProductUI } from "@/types";
import ProductCard from "@/components/ProductCard";
import Button from "@/components/ui/Button";
import {
  ChevronRight,
  Truck,
  Tag,
  Flame,
  Star,
  Send,
  RotateCcw,
  PackageOpen,
  MapPin,
  ArrowRight,
} from "lucide-react";
import { HeroBanner, SearchBar, NewsletterSection } from "./HomeInteractive";

// La home era 100% client-side: el HTML inicial que ve Google (y el usuario
// antes de hidratar) eran skeletons de carga, sin nombres de producto ni
// categorías reales — malo para indexación y para el primer paint. Ahora es
// un Server Component que trae productos/categorías/settings en el server;
// solo el carrusel, el buscador y el formulario de newsletter (que sí
// necesitan estado de navegador) siguen siendo client components, importados
// desde HomeInteractive.tsx.
export const revalidate = 300;

export const metadata: Metadata = {
  // title/description/OG se heredan del layout raíz (ya dicen "Olivo Market"
  // y la descripción de marca) — acá solo fijamos el canonical de "/".
  alternates: { canonical: "/" },
};

type PageBlock = {
  type: string;
  enabled: boolean;
  title?: string;
  itemsToShow?: number;
};

// Cada fetch se protege por separado: si Supabase está momentáneamente
// inalcanzable durante el build/ISR, la home debe seguir rendereando (con
// los defaults del hero, sin categorías o sin productos) en vez de tirar
// abajo toda la build — antes, siendo 100% cliente, un hiccup de red nunca
// rompía el build porque no se fetcheaba nada server-side.
async function getHomeSettings() {
  try {
    const { data } = await supabaseServer
      .from("settings")
      .select("hero_title, hero_description, blocks")
      .eq("id", true)
      .maybeSingle();
    return data;
  } catch {
    return null;
  }
}

async function getHomeCategories() {
  try {
    const { data } = await supabaseServer
      .from("categories")
      .select("id, name, slug")
      .eq("is_active", true)
      .order("name");
    return data || [];
  } catch {
    return [];
  }
}

async function getHomeProducts() {
  try {
    return await fetchAllProducts();
  } catch {
    return [];
  }
}

export default async function Home() {
  const [settings, categories, allProducts] = await Promise.all([
    getHomeSettings(),
    getHomeCategories(),
    getHomeProducts(),
  ]);

  const blocks: PageBlock[] = Array.isArray(settings?.blocks)
    ? settings.blocks.filter((b: PageBlock) => b.enabled)
    : [];
  const productsBlock = blocks.find((b) => b.type === "products");
  const productLimit = productsBlock?.itemsToShow ?? 10;
  const productTitle = productsBlock?.title ?? "Lo más vendido";

  const visible = allProducts.filter((p) => p.isActive && isProductVisible(p));
  const featured = visible.filter((p) => p.featured).sort((a, b) => a.name.localeCompare(b.name, "es"));
  const rest = visible.filter((p) => !p.featured).sort((a, b) => a.name.localeCompare(b.name, "es"));
  const products = [...featured, ...rest].slice(0, productLimit);

  return (
    <div className="bg-gray-50 min-h-screen">
      <ShippingStrip />
      <HeroBanner heroTitle={settings?.hero_title ?? undefined} heroDescription={settings?.hero_description ?? undefined} />
      <SearchBar />
      <CategoryStrip categories={categories} />
      <PromoBannersRow />
      <ProductsSection title={productTitle} products={products} />
      <LogisticsSection />
      <NewsletterSection />
    </div>
  );
}

// ── Shipping Strip ─────────────────────────────────────────────────────────────

function ShippingStrip() {
  return (
    <div className="bg-emerald-600 text-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-wrap items-center justify-center sm:justify-between gap-x-8 gap-y-1.5 py-2.5 text-[11px] sm:text-xs font-bold uppercase tracking-wide">
          {[
            { icon: Truck, text: "Despacho gratis desde $25.000" },
            { icon: Star, text: "Calidad garantizada" },
            { icon: Tag, text: "Precios competitivos" },
          ].map(({ icon: Icon, text }) => (
            <span key={text} className="flex items-center gap-1.5">
              <Icon className="w-3.5 h-3.5 shrink-0" />
              {text}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Category Strip ─────────────────────────────────────────────────────────────

function CategoryStrip({ categories }: { categories: { id: string | number; name: string; slug: string | null }[] }) {
  if (categories.length === 0) return null;

  return (
    <div className="bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center gap-2 py-2.5 overflow-x-auto scrollbar-none">
          <Link
            href="/productos"
            className="shrink-0 flex items-center gap-1.5 px-4 h-8 rounded-full bg-emerald-600 text-white text-xs font-black hover:bg-emerald-700 transition-colors whitespace-nowrap"
          >
            <Flame className="w-3.5 h-3.5" />
            Todo
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/productos?categoria=${cat.slug || cat.id}`}
              className="shrink-0 px-4 h-8 rounded-full border border-gray-200 bg-white text-gray-700 text-xs font-semibold hover:border-emerald-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors whitespace-nowrap"
            >
              {cat.name}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Promo Banners Row ──────────────────────────────────────────────────────────

function PromoBannersRow() {
  return (
    <div className="bg-white py-4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { title: "Envío a domicilio", desc: "Recibe en 24-48h", icon: Truck, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100", href: "/productos" },
            { title: "Pago contra entrega", desc: "Paga al recibir tu pedido", icon: Tag, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100", href: "/productos" },
            { title: "Retiro en tienda", desc: "Sin costo adicional", icon: MapPin, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100", href: "/productos" },
          ].map(({ title, desc, icon: Icon, color, bg, border, href }) => (
            <Link
              key={title}
              href={href}
              className={`flex items-center gap-3 p-4 rounded-2xl border ${border} ${bg} hover:shadow-md transition-all group`}
            >
              <div className={`w-10 h-10 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div className="min-w-0">
                <p className={`text-sm font-black text-gray-900 group-hover:${color} transition-colors`}>{title}</p>
                <p className="text-xs text-gray-500 truncate">{desc}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 ml-auto shrink-0 transition-colors" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Products Section ───────────────────────────────────────────────────────────

function ProductsSection({ title, products }: { title: string; products: ProductUI[] }) {
  return (
    <section className="py-6 sm:py-8 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-4 sm:mb-5">
          <h2 className="text-lg sm:text-xl font-black text-gray-900 flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500" />
            {title}
          </h2>
          <Link href="/productos" className="flex items-center gap-0.5 text-xs sm:text-sm font-bold text-emerald-600 hover:text-emerald-700 transition-colors">
            Ver todos <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">No hay productos disponibles aún.</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

        {products.length > 0 && (
          <div className="text-center mt-6">
            <Link href="/productos">
              <Button className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-emerald-300 hover:text-emerald-700 rounded-xl px-8 h-10 text-sm font-bold transition-all shadow-sm">
                Ver más productos <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

// ── Logistics Section ──────────────────────────────────────────────────────────

function LogisticsSection() {
  return (
    <section className="py-8 bg-white border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg sm:text-xl font-black text-gray-900">Centro Logístico Olivo</h2>
          <Link href="/centro-logistico" className="flex items-center gap-0.5 text-xs sm:text-sm font-bold text-emerald-600 hover:text-emerald-700">
            Ver más <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { icon: PackageOpen, title: "Recibe", desc: "Punto pick-up oficial de MercadoLibre", color: "text-blue-600", bg: "bg-blue-50" },
            { icon: Send, title: "Envía", desc: "Bluexpress, Chilexpress, Correos", color: "text-emerald-600", bg: "bg-emerald-50" },
            { icon: RotateCcw, title: "Devuelve", desc: "Gestiona devoluciones fácil y rápido", color: "text-amber-600", bg: "bg-amber-50" },
          ].map(({ icon: Icon, title, desc, color, bg }) => (
            <div key={title} className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:shadow-md transition-all">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div>
                <p className="text-sm font-black text-gray-900">{title}</p>
                <p className="text-xs text-gray-500">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
