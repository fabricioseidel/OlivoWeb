import "./globals.css";
import type { Metadata, Viewport } from "next";
import { unstable_cache } from "next/cache";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import Providers from "./providers";
import AppShell from "@/components/layout/AppShell";
import { DevErrorBoundary } from "@/components/debug/DevErrorBoundary";
import { ClickTracker } from "@/components/debug/ClickTracker";
import { supabase } from "@/lib/supabase";
import { BUSINESS } from "@/lib/seo/business";

const inter = Inter({ subsets: ["latin"] });

// El favicon configurado en el Constructor Visual (Admin → Laboratorio) se lee
// server-side y se renderiza como <link rel="icon"> en el HTML inicial. Antes
// solo se inyectaba por JS (SettingsInjector), lo que llegaba demasiado tarde
// para crawlers como Google — por eso el buscador mostraba el favicon por
// defecto (el triángulo de Vercel) en vez del logo de la tienda.
const getFaviconUrl = unstable_cache(
  async () => {
    const { data } = await supabase.from("settings").select("favicon_url").eq("id", true).single();
    return (data?.favicon_url as string | null) || null;
  },
  ["root-layout-favicon-url"],
  { revalidate: 60 }
);

export async function generateMetadata(): Promise<Metadata> {
  let faviconUrl: string | null = null;
  try {
    faviconUrl = await getFaviconUrl();
  } catch {
    // Sin settings o DB no disponible en build: cae al favicon.ico estático
  }

  return {
    // Base para resolver los canonical relativos de todas las páginas
    metadataBase: new URL(BUSINESS.url),
    title: "Olivo Market",
    description: BUSINESS.description,
    icons: faviconUrl
      ? { icon: faviconUrl, shortcut: faviconUrl, apple: faviconUrl }
      : undefined,
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CL" className="h-full" suppressHydrationWarning>
      <body className={`${inter.className} h-full bg-gray-50 antialiased`} suppressHydrationWarning>
        <Providers>
          <ClickTracker />
          <DevErrorBoundary>
            <AppShell>{children}</AppShell>
          </DevErrorBoundary>
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
