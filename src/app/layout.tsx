import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import AuthProvider from "@/providers/AuthProvider";
import { CartProvider } from "@/contexts/CartContext";
import { ProductProvider } from "@/contexts/ProductContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { ConfirmProvider } from "@/contexts/ConfirmContext";

// Importar el script de restauración de datos en desarrollo
if (process.env.NODE_ENV === 'development') {
  import("@/utils/dataRestoration");
}

import DataCleanup from "@/components/DataCleanup";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OLIVOMARKET - como en casa pero más cerquita",
  description: "Tienda en línea con productos de calidad a precios accesibles",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <AuthProvider>
          <CartProvider>
            <ProductProvider>
              <ToastProvider>
                <ConfirmProvider>
                  <DataCleanup />
                  <Navbar />
                  <main className="flex-grow">{children}</main>
                  <Footer />
                </ConfirmProvider>
              </ToastProvider>
            </ProductProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
