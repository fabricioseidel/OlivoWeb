import "./globals.css";
import type { Metadata } from "next";
import React from "react";

import Providers from "./providers";
import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import { SettingsInjector } from "@/components/admin/SettingsInjector";
import { ProductProvider } from "@/contexts/ProductContext";
import { CategoryProvider } from "@/contexts/CategoryContext";

export const metadata: Metadata = {
  title: "OLIVOMARKET",
  description: "Minimarket venezolano en Chile",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full">
      <body className="h-full bg-gray-50">
        <Providers>
          <SettingsInjector />
          <ProductProvider>
            <CategoryProvider>
              <div className="min-h-screen flex flex-col">
                <header className="sticky top-0 z-50 bg-white shadow">
                  <Navbar />
                </header>
                <main className="flex-1 bg-white">{children}</main>
                <Footer />
              </div>
            </CategoryProvider>
          </ProductProvider>
        </Providers>
      </body>
    </html>
  );
}
