import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import Providers from "./providers";
import ShopShell from "@/components/layout/ShopShell";
import { SettingsInjector } from "@/components/admin/SettingsInjector";
import { ProductProvider } from "@/contexts/ProductContext";
import { CategoryProvider } from "@/contexts/CategoryContext";
import { DevErrorBoundary } from "@/components/debug/DevErrorBoundary";
import { ClickTracker } from "@/components/debug/ClickTracker";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Olivo Market",
  description: "Productos venezolanos premium en Chile",
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
