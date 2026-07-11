import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { unstable_cache } from "next/cache";
import Providers from "./providers";
import ShopShell from "@/components/layout/ShopShell";
import { SettingsInjector } from "@/components/admin/SettingsInjector";
import { ProductProvider } from "@/contexts/ProductContext";
import { DevErrorBoundary } from "@/components/debug/DevErrorBoundary";
import { ClickTracker } from "@/components/debug/ClickTracker";
import { supabase } from "@/lib/supabase";

const inter = Inter({ subsets: ["latin"] });

// El favicon por defecto de Next.js (src/app/favicon.ico) es el triángulo de
// Vercel; usamos el favicon o logo configurado en Admin → Configuración →
// Apariencia si existe, para que la pestaña muestre la marca de la tienda.
export const revalidate = 3600;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";

const getSiteSettings = unstable_cache(
  async () => {
    const { data } = await supabase
      .from("settings")
      .select("favicon_url, logo_url, store_name, store_phone, store_address")
      .eq("id", true)
      .single();
    return data ?? null;
  },
  ["site-settings-seo"],
  { revalidate: 3600 }
);

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings().catch(() => null);
  const iconUrl = settings?.favicon_url || settings?.logo_url || undefined;

  const title = "Olivo Market";
  const description = "Productos venezolanos premium en Chile. Envío a domicilio o retiro en tienda — comida, snacks y abarrotes venezolanos en Santiago.";

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: title,
      template: `%s | ${title}`,
    },
    description,
    // OJO: no seteamos `alternates.canonical` acá — Next.js hereda el campo
    // de metadata tal cual a las páginas hijas que no lo sobrescriben, así
    // que un canonical fijo en la raíz terminaría marcando TODAS las páginas
    // como "duplicadas" de la home. Cada página que lo necesite (home,
    // producto, categoría) lo define en su propio generateMetadata.
    robots: { index: true, follow: true },
    openGraph: {
      title,
      description,
      type: "website",
      url: SITE_URL,
      siteName: title,
      locale: "es_CL",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    ...(process.env.GOOGLE_SITE_VERIFICATION
      ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } }
      : {}),
    ...(iconUrl ? { icons: { icon: iconUrl } } : {}),
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSiteSettings().catch(() => null);
  const storeName = settings?.store_name || "Olivo Market";

  // Organization + WebSite + LocalBusiness JSON-LD: le dice a Google que
  // olivomarket.cl ES la entidad oficial de la marca "Olivo Market" — la
  // señal principal para que la búsqueda del nombre de marca posicione el
  // sitio en vez de listados de terceros (redes sociales, marketplaces).
  // Se renderiza server-side en el layout raíz, así que está presente en el
  // HTML inicial sin depender de que Googlebot ejecute JS de las páginas
  // cliente.
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: storeName,
      alternateName: "OlivoMarket",
      url: SITE_URL,
      ...(settings?.logo_url ? { logo: settings.logo_url } : {}),
      ...(settings?.store_phone ? { telephone: settings.store_phone } : {}),
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: storeName,
      url: SITE_URL,
      potentialAction: {
        "@type": "SearchAction",
        target: `${SITE_URL}/productos?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "GroceryStore",
      name: storeName,
      url: SITE_URL,
      ...(settings?.logo_url ? { image: settings.logo_url } : {}),
      ...(settings?.store_phone ? { telephone: settings.store_phone } : {}),
      ...(settings?.store_address ? { address: { "@type": "PostalAddress", streetAddress: settings.store_address, addressCountry: "CL" } } : {}),
      priceRange: "$$",
    },
  ];

  return (
    <html lang="es" className="h-full" suppressHydrationWarning>
      <body className={`${inter.className} h-full bg-gray-50 antialiased`} suppressHydrationWarning>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <Providers>
          <ClickTracker />
          <DevErrorBoundary>
            <SettingsInjector />
            <ProductProvider>
              <ShopShell>{children}</ShopShell>
            </ProductProvider>
          </DevErrorBoundary>
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
