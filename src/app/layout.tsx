import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import Providers from "./providers";
import ShopShell from "@/components/layout/ShopShell";
import { SettingsInjector } from "@/components/admin/SettingsInjector";
import { ProductProvider } from "@/contexts/ProductContext";
import { CategoryProvider } from "@/contexts/CategoryContext";
import { DevErrorBoundary } from "@/components/debug/DevErrorBoundary";
import { ClickTracker } from "@/components/debug/ClickTracker";
import { supabase } from "@/lib/supabase";

const inter = Inter({ subsets: ["latin"] });

// El favicon por defecto de Next.js (src/app/favicon.ico) es el triángulo de
// Vercel; usamos el favicon o logo configurado en Admin → Configuración →
// Apariencia si existe, para que la pestaña muestre la marca de la tienda.
export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  let iconUrl: string | undefined;
  try {
    const { data } = await supabase
      .from("settings")
      .select("favicon_url, logo_url")
      .eq("id", true)
      .single();
    iconUrl = data?.favicon_url || data?.logo_url || undefined;
  } catch {
    // Sin settings disponibles: cae al favicon.ico estático por defecto.
  }

  return {
    title: "Olivo Market",
    description: "Productos venezolanos premium en Chile",
    ...(iconUrl ? { icons: { icon: iconUrl } } : {}),
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full" suppressHydrationWarning>
      <body className={`${inter.className} h-full bg-gray-50 antialiased`} suppressHydrationWarning>
        <Providers>
          <ClickTracker />
          <DevErrorBoundary>
            <SettingsInjector />
            <ProductProvider>
              <CategoryProvider>
                <ShopShell>{children}</ShopShell>
              </CategoryProvider>
            </ProductProvider>
          </DevErrorBoundary>
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
