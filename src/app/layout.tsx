import "./globals.css";
import type { Metadata } from "next";
import React from "react";

import Providers from "./providers";
import Navbar from "@/components/layout/Navbar";
import { SettingsInjector } from "@/components/admin/SettingsInjector";

// 👉 ajusta estos imports si tus paths de contextos son distintos
import { ProductProvider } from "@/contexts/ProductContext";
import { CategoryProvider } from "@/contexts/CategoryContext";

export const metadata: Metadata = {
  title: "OLIVOMARKET",
  description: "Minimarket venezolano en Chile",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full">
      <head>
        <style>{`
          :root {
            --color-primary: #10B981;
            --color-secondary: #059669;
            --color-accent: #047857;
            --color-footer-bg: #1F2937;
            --color-footer-text: #F3F4F6;
          }
        `}</style>
      </head>
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
              </div>
            </CategoryProvider>
          </ProductProvider>
        </Providers>
      </body>
    </html>
  );
}
