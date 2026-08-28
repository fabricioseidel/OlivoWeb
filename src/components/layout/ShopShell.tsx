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
          {/* Saltar al contenido. Sin esto, quien navega con teclado tiene que
              pasar por los ~12 controles del navbar —logo, seis enlaces,
              buscador, carrito, Entrar y Registrarse— antes de llegar al
              contenido, y otra vez en cada página. Es WCAG 2.4.1, nivel A.
              Va invisible hasta que recibe el foco, y es el primer elemento
              del árbol para que sea la primera parada del tabulador. */}
          <a
            href="#contenido"
            className="o-focus sr-only rounded-xl focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-brand-texto focus:shadow-lg"
          >
            Saltar al contenido
          </a>
          <PreviewBanner />
          <header className="sticky top-0 z-50 bg-white shadow">
            <Navbar />
          </header>
        </>
      )}
      <main id="contenido" tabIndex={-1} className={`flex-1 outline-none ${isAdmin ? "" : "bg-white"}`}>
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
