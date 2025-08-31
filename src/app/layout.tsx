import "./globals.css";
import type { Metadata } from "next";
import React from "react";

import Providers from "./providers";
import Navbar from "@/components/layout/Navbar";

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
      <body className="h-full bg-gray-50">
        <Providers>
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
