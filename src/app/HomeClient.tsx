"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { useProducts } from "@/contexts/ProductContext";
import { isProductVisible } from "@/services/products";
import ProductCard from "@/components/ProductCard";
import CategoryCard from "@/components/CategoryCard";
import NewsletterWidget from "@/components/NewsletterWidget";
import { useCategories } from "@/hooks/useCategories";
import { DEFAULT_BLOCKS, type PageBlock } from "@/lib/page-blocks";
import { BUSINESS } from "@/lib/seo/business";
import { useSiteCopy } from "@/hooks/useSiteCopy";
import {
  ChevronRight,
  Truck,
  Shield,
  BadgeCheck,
  Search,
  Tag,
  Flame,
  Zap,
} from "lucide-react";

export default function HomeClient({ initialBlocks = null }: { initialBlocks?: PageBlock[] | null }) {
  const { products, loading: productsLoading } = useProducts();
  const { categories, loading: categoriesLoading } = useCategories();
  const { settings: storeSettings } = useStoreSettings();

  const visible = products.filter(p => p.isActive && isProductVisible(p));
  const featured = visible.filter(p => p.featured).sort((a, b) => a.name.localeCompare(b.name, "es"));
  const rest = visible.filter(p => !p.featured).sort((a, b) => a.name.localeCompare(b.name, "es"));
  const ranked = [...featured, ...rest];
  const offerProducts = visible.filter(p => p.offerPrice && p.offerPrice < p.price);

  // Bloques del Constructor Visual (admin → Laboratorio).
  // Prioridad: los que llegaron del servidor (evitan el cambio de contenido en
  // la primera carga) → los del hook una vez cargado → el layout por defecto.
  const savedBlocks = storeSettings?.appearance?.blocks;
  const effectiveBlocks =
    savedBlocks && savedBlocks.length > 0
      ? savedBlocks
      : initialBlocks && initialBlocks.length > 0
      ? initialBlocks
      : DEFAULT_BLOCKS;
  const blocks = effectiveBlocks.filter(b => b.enabled);

  // "Más productos" continúa donde terminó el bloque "Más vendidos"
  const topCount = blocks.find(b => b.type === "products")?.itemsToShow ?? 10;

  return (
    <div className="bg-gray-50 min-h-screen">
      {blocks.map(block => {
        switch (block.type) {
          case "hero":
            return (
              <HeroBlock
                key={block.id}
                block={block}
                fallbackTitle={storeSettings?.heroTitle}
                fallbackDescription={storeSettings?.heroDescription}
                storeSettings={storeSettings}
                showCategoriesBar
                categories={categories}
                categoriesLoading={categoriesLoading}
              />
            );
          case "features":
            return <FeaturesBlock key={block.id} />;
          case "products":
            return (
              <ProductSection
                key={block.id}
                title={block.title || "Lo más vendido"}
                icon={<Flame className="w-5 h-5 text-orange-500" />}
                products={ranked.slice(0, block.itemsToShow ?? 10)}
                loading={productsLoading}
                href="/productos"
              />
            );
          case "banner":
            return <BannerBlock key={block.id} block={block} />;
          case "offers":
            return offerProducts.length > 0 ? (
              <ProductSection
                key={block.id}
                title={block.title || "Ofertas especiales"}
                icon={<Tag className="w-5 h-5 text-red-500" />}
                products={offerProducts.slice(0, block.itemsToShow ?? 10)}
                loading={productsLoading}
                href="/ofertas"
              />
            ) : null;
          case "categories":
            return (
              <CategoriesBlock
                key={block.id}
                title={block.title || "Nuestras categorías"}
                categories={categories}
                loading={categoriesLoading}
              />
            );
          case "more_products": {
            const more = ranked.slice(topCount, topCount + (block.itemsToShow ?? 10));
            return more.length > 0 ? (
              <ProductSection
                key={block.id}
                title={block.title || "Más productos"}
                icon={<Zap className="w-5 h-5 text-brand-600" />}
                products={more}
                loading={productsLoading}
                href="/productos"
                bg="bg-white"
              />
            ) : null;
          }
          case "newsletter":
            return (
              <section key={block.id} className="py-8 px-4 max-w-7xl mx-auto">
                <NewsletterWidget title={block.title} description={block.description} />
              </section>
            );
          default:
            return null;
        }
      })}

      {/* ── VER TODOS ── */}
      <section className="py-10 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <Link href="/productos"
            className="o-focus inline-flex h-12 items-center gap-2 rounded-xl bg-brand-600 px-8 text-base font-semibold text-white transition-colors hover:bg-brand-700">
            Ver todos los productos <ChevronRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}

/* ── Bloques ── */

function HeroBlock({
  block,
  fallbackTitle,
  fallbackDescription,
  storeSettings,
  showCategoriesBar,
  categories,
  categoriesLoading,
}: {
  block: PageBlock;
  fallbackTitle?: string;
  fallbackDescription?: string;
  storeSettings?: { appearance?: { bannerUrl?: string | null } } | null;
  showCategoriesBar?: boolean;
  categories: any[];
  categoriesLoading: boolean;
}) {
  const router = useRouter();
  const { t } = useSiteCopy();
  const [heroQuery, setHeroQuery] = useState("");

  const submitHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = heroQuery.trim();
    router.push(q ? `/productos?q=${encodeURIComponent(q)}` : "/productos");
  };

  // El H1 debe comunicar el posicionamiento dual (minimarket + paquetería) y
  // contener la comuna: es la señal más fuerte de SEO local de la página.
  const title =
    block.title || fallbackTitle || "Tu minimarket en Ñuñoa, con despacho a domicilio";
  const description =
    block.description ||
    fallbackDescription ||
    "Más de 700 productos: abarrotes, bebidas, lácteos, panadería, helados y aseo. Y punto de retiro y envío de encomiendas en Av. José Pedro Alessandri 2010.";
  const buttonText = block.buttonText || "Comprar ahora";
  const buttonLink = block.buttonLink || "/productos";

  // El banner del panel («Apariencia → Banner principal») se guardaba en la
  // base y no lo mostraba nadie: se podía subir una imagen y no pasaba nada.
  // Va de fondo del encabezado, que es donde el propio panel dice que va.
  const banner = storeSettings?.appearance?.bannerUrl;

  return (
    <>
      <section className="relative overflow-hidden bg-brand-900">
        {banner && (
          <>
            <div
              aria-hidden
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${banner})` }}
            />
            {/* Sin este velo, una foto clara deja el título blanco ilegible.
                Se mantiene el color de marca para que el encabezado siga
                siendo reconocible con cualquier imagen. */}
            <div aria-hidden className="absolute inset-0 bg-brand-950/75" />
          </>
        )}
        <div className="relative max-w-7xl mx-auto px-4 py-8 md:py-10 grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6 items-center">
          {/* Left: text + search */}
          <div className="text-white">
            <p className="mb-2 text-sm font-medium text-brand-300">
              {block.subtitle || "Minimarket y punto de encomiendas · Ñuñoa"}
            </p>
            <h1 className="o-display mb-2 text-white">
              {title}
            </h1>
            <p className="text-brand-100/70 text-sm md:text-base mb-5 max-w-md">
              {description}
            </p>
            <form onSubmit={submitHeroSearch} className="flex max-w-xl gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                <input
                  type="search"
                  value={heroQuery}
                  onChange={(e) => setHeroQuery(e.target.value)}
                  placeholder="Buscar productos..."
                  className="w-full h-12 pl-11 pr-4 rounded-xl bg-white text-gray-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
              </div>
              <button
                type="submit"
                className="o-focus h-12 shrink-0 rounded-xl bg-brand-500 px-6 text-sm font-semibold text-white transition-colors hover:bg-brand-400"
              >
                Buscar
              </button>
            </form>
            <div className="flex flex-wrap gap-3 mt-5">
              <Link href={buttonLink} className="inline-flex items-center gap-1.5 bg-brand-500 hover:bg-brand-400 text-white font-bold text-sm px-5 h-10 rounded-lg transition-colors">
                {buttonText} <ChevronRight className="w-4 h-4" />
              </Link>
              <Link href="/ofertas" className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-sm px-5 h-10 rounded-lg transition-colors">
                <Tag className="w-4 h-4 text-amber-400" /> Ver ofertas
              </Link>
            </div>

            {/* Punto de envíos: couriers, horario y dirección en texto plano.
                Es el contenido que respalda el schema y las búsquedas locales. */}
            <div className="mt-6 pt-5 border-t border-white/10 space-y-3">
              <p className="text-sm font-semibold text-brand-300">
                {t("home.shipping.title")}
              </p>
              <ul className="flex flex-wrap gap-2">
                {BUSINESS.services.map((s) => (
                  <li key={s.slug}>
                    <Link
                      href={`/punto-de-envio/${s.slug}`}
                      className="inline-flex items-center rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-white/20"
                    >
                      {s.nombre}
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="text-sm text-brand-100/80">
                {BUSINESS.addressFull}
              </p>
              <p className="text-sm text-brand-100/80">
                {BUSINESS.openingHoursDisplay
                  .map((h) => `${h.label}: ${h.value}`)
                  .join(" · ")}
                {" · "}
                <a href={`tel:${BUSINESS.phoneE164}`} className="font-bold text-white hover:underline">
                  {BUSINESS.phoneDisplay}
                </a>
              </p>
            </div>
          </div>

          {/* Right: promo cards */}
          <div className="hidden lg:grid grid-cols-2 gap-3">
            <Link href="/ofertas" className="col-span-2 bg-amber-400/20 border border-amber-400/30 rounded-2xl p-5 text-center hover:bg-amber-400/30 transition-colors">
              <p className="mb-1 text-sm font-medium text-amber-200">Ofertas especiales</p>
              <p className="text-2xl font-bold text-white">Ver descuentos</p>
              <p className="text-amber-200/70 text-xs mt-1">en productos seleccionados</p>
            </Link>
            <div className="bg-white/10 border border-white/15 rounded-2xl p-4 flex items-center gap-3">
              <Truck className="w-8 h-8 text-brand-400 shrink-0" />
              <div>
                <p className="text-sm font-semibold leading-snug text-white">Envío rápido</p>
                <p className="text-brand-300/70 text-xs">Llega en 24-48h</p>
              </div>
            </div>
            <div className="bg-white/10 border border-white/15 rounded-2xl p-4 flex items-center gap-3">
              <BadgeCheck className="w-8 h-8 text-brand-400 shrink-0" />
              <div>
                <p className="text-sm font-semibold leading-snug text-white">Compra protegida</p>
                <p className="text-brand-300/70 text-xs">Calidad asegurada</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CATEGORÍAS (barra de navegación horizontal) ── */}
      {showCategoriesBar && (
        <section className="bg-white border-b border-gray-100 sticky top-0 z-30 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-2 flex gap-2 overflow-x-auto scrollbar-hide">
            <Link href="/productos" className="shrink-0 px-4 py-1.5 rounded-full bg-brand-600 text-white text-xs font-bold whitespace-nowrap hover:bg-brand-500 transition-colors">
              Todo
            </Link>
            {!categoriesLoading && [...categories].sort((a, b) => a.name.localeCompare(b.name, "es")).map(cat => (
              <Link key={cat.id} href={`/productos?categoria=${cat.slug || cat.id}`}
                className="shrink-0 px-4 py-1.5 rounded-full bg-gray-100 hover:bg-brand-50 hover:text-brand-700 text-gray-700 text-xs font-bold whitespace-nowrap transition-colors">
                {cat.name}
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function FeaturesBlock() {
  return (
    <section className="bg-brand-900">
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-wrap justify-center sm:justify-between gap-y-2 divide-x divide-white/10">
        {[
          { icon: Truck,      text: "Envío en 24-48h" },
          { icon: BadgeCheck, text: "Calidad garantizada" },
          { icon: Shield,     text: "Pago 100% seguro" },
        ].map(({ icon: Icon, text }) => (
          <div key={text} className="flex items-center gap-2 px-4 sm:px-8">
            <Icon className="w-4 h-4 text-brand-400 shrink-0" />
            <span className="whitespace-nowrap text-sm text-brand-100/80">{text}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function BannerBlock({ block }: { block: PageBlock }) {
  return (
    <section className="py-4 px-4 max-w-7xl mx-auto">
      <Link href={block.buttonLink || "/ofertas"} className="block rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 p-6 md:p-8 relative overflow-hidden hover:opacity-95 transition-opacity">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-orange-600/40 to-transparent" />
        
        <p className="o-h1 text-white">
          {block.title || "Descuentos hasta 40% OFF"}
        </p>
        {block.description && (
          <p className="text-white/70 text-sm mt-2">{block.description}</p>
        )}
        <span className="mt-4 inline-flex h-10 items-center gap-1 rounded-lg bg-white px-5 text-sm font-semibold text-orange-700">
          {block.buttonText || "Ver ofertas"} <ChevronRight className="w-4 h-4" />
        </span>
      </Link>
    </section>
  );
}

function CategoriesBlock({
  title,
  categories,
  loading,
}: {
  title: string;
  categories: any[];
  loading: boolean;
}) {
  return (
    <section className="py-8 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <SectionHeader title={title} icon={null} href="/productos" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-28 bg-gray-100 animate-pulse rounded-2xl" />)
            : [...categories].sort((a, b) => a.name.localeCompare(b.name, "es")).slice(0, 6).map(cat => (
                <CategoryCard
                  key={cat.id}
                  href={`/productos?categoria=${cat.slug || cat.id}`}
                  category={{ ...cat, slug: cat.slug || cat.id, image: cat.image || null }}
                />
              ))
          }
        </div>
        {categories.length > 6 && (
          <div className="text-center mt-4">
            <Link href="/categorias" className="o-focus inline-flex items-center gap-1 rounded text-sm font-medium text-brand-700 hover:text-brand-800">
              Ver todas las categorías <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

/* ── Helpers ── */

function SectionHeader({ title, icon, href }: { title: string; icon: React.ReactNode; href: string }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="o-h2 text-neutral-900">{title}</h2>
      </div>
      <Link href={href} className="o-focus flex items-center gap-1 rounded text-sm font-medium text-brand-700 hover:text-brand-800">
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
