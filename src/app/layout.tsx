import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import Providers from "./providers";
import ShopShell from "@/components/layout/ShopShell";
import { SettingsInjector } from "@/components/admin/SettingsInjector";
import { ProductProvider } from "@/contexts/ProductContext";
import { CategoryProvider } from "@/contexts/CategoryContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Olivo Market",
  description: "Productos venezolanos premium en Chile",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full">
      <body className={`${inter.className} h-full bg-gray-50 antialiased`}>
        <Providers>
          <SettingsInjector />
          <ProductProvider>
            <CategoryProvider>
              <ShopShell>{children}</ShopShell>
            </CategoryProvider>
          </ProductProvider>
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
