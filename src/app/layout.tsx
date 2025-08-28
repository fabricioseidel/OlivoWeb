import "./globals.css";
import type { Metadata } from "next";
import React from "react";

import Providers from "./providers";
import Navbar from "@/components/layout/Navbar";

// 👉 ajusta estos imports si tus paths de contextos son distintos
import { ProductProvider } from "@/contexts/ProductContext";
import { CategoryProvider } from "@/contexts/CategoryContext";

export const metadata: Metadata = {
  title: "Mi Tienda",
  description: "Ecommerce",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <Providers>
          <ProductProvider>
            <CategoryProvider>
              <Navbar />
              <main className="min-h-screen">{children}</main>
            </CategoryProvider>
          </ProductProvider>
        </Providers>
      </body>
    </html>
  );
}
