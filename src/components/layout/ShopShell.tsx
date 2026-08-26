"use client";

import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import Navbar from "./Navbar";
import BottomNav from "./BottomNav";
import PreviewBanner from "./PreviewBanner";
import Footer from "./Footer";

export default function ShopShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");

  return (
    <div className="min-h-screen flex flex-col">
      {!isAdmin && (
        <>
          <PreviewBanner />
          <header className="sticky top-0 z-50 bg-white shadow">
            <Navbar />
          </header>
        </>
      )}
      <main className={`flex-1 ${isAdmin ? "" : "bg-white"}`}>
        {children}
      </main>
      {/* El pie existía desde hace tiempo y no lo montaba nadie: el sitio se
          servía sin footer, así que el NAP —la dirección y el teléfono que el
          SEO local exige que aparezcan idénticos en todo el sitio— no estaba
          en ninguna página. El padding inferior se mueve acá porque en móvil
          el que tapa contenido es el pie, no el <main>. */}
      {!isAdmin && (
        <>
          <div className="pb-20 md:pb-0">
            <Footer />
          </div>
          <BottomNav />
        </>
      )}
    </div>
  );
}
