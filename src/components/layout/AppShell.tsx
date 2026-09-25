"use client";

import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import ShopShell from "./ShopShell";
import { SettingsInjector } from "@/components/admin/SettingsInjector";
import { ProductProvider } from "@/contexts/ProductContext";
import { CategoryProvider } from "@/contexts/CategoryContext";

/**
 * Decide qué envoltorio recibe cada ruta.
 *
 * /operaciones es la app del teléfono: se monta pelada, sin el catálogo de la
 * tienda ni la configuración de apariencia, porque nada de eso se usa en el
 * mostrador y en un celular con señal débil cada request cuenta.
 *
 * El resto del sitio conserva exactamente el árbol de antes.
 */
export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const esAppOperaciones = pathname?.startsWith("/operaciones") ?? false;

  if (esAppOperaciones) return <>{children}</>;

  return (
    <>
      <SettingsInjector />
      <ProductProvider>
        <CategoryProvider>
          <ShopShell>{children}</ShopShell>
        </CategoryProvider>
      </ProductProvider>
    </>
  );
}
