"use client";

import "./globals.css";
import React from "react";
import { Inter } from "next/font/google";
import { usePathname } from "next/navigation";

import Providers from "./providers";
import Navbar from "@/components/layout/Navbar";
import BottomNav from "@/components/layout/BottomNav";
import { SettingsInjector } from "@/components/admin/SettingsInjector";

import { ProductProvider } from "@/contexts/ProductContext";
import { CategoryProvider } from "@/contexts/CategoryContext";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");

  return (
    <html lang="es" className="h-full">
      <body className={`${inter.className} h-full bg-gray-50 antialiased`}>
        <Providers>
          <SettingsInjector />
          <ProductProvider>
            <CategoryProvider>
              <div className="min-h-screen flex flex-col">
                {!isAdmin && (
                  <header className="sticky top-0 z-50 bg-white shadow">
                    <Navbar />
                  </header>
                )}
                <main className={`flex-1 ${isAdmin ? '' : 'bg-white pb-20 md:pb-0'}`}>{children}</main>
                {!isAdmin && <BottomNav />}
              </div>
            </CategoryProvider>
          </ProductProvider>
        </Providers>
      </body>
    </html>
  );
}

