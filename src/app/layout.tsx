import "./globals.css";
import type { Metadata } from "next";
import React from "react";
import { Inter } from "next/font/google";

import Providers from "./providers";
import Navbar from "@/components/layout/Navbar";
import BottomNav from "@/components/layout/BottomNav";
import { SettingsInjector } from "@/components/admin/SettingsInjector";

// 👉 ajusta estos imports si tus paths de contextos son distintos
import { ProductProvider } from "@/contexts/ProductContext";
import { CategoryProvider } from "@/contexts/CategoryContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "OLIVOMARKET",
  description: "Minimarket venezolano en Chile",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full">
      <body className={`${inter.className} h-full bg-gray-50 antialiased`}>
        <Providers>
          <SettingsInjector />
          <ProductProvider>
            <CategoryProvider>
              <div className="min-h-screen flex flex-col">
                <header className="sticky top-0 z-50 bg-white shadow">
                  <Navbar />
                </header>
                <main className="flex-1 bg-white pb-20 md:pb-0">{children}</main>
                <BottomNav />
              </div>
            </CategoryProvider>
          </ProductProvider>
        </Providers>
      </body>
    </html>
  );
}

