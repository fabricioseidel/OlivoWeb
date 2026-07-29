import type { Metadata, Viewport } from "next";
import { BranchProvider } from "@/contexts/BranchContext";

/**
 * App de operaciones para el teléfono (APK).
 *
 * Deliberadamente NO cuelga del panel admin: no trae barra lateral, ni
 * catálogo de la tienda, ni navegación a otras secciones. Sólo Venta,
 * Recepción, Inventario, Caja y Cierre, que es lo que se usa en el mostrador.
 *
 * El acceso se valida igual que el resto del admin (middleware + sesión
 * NextAuth con rol ADMIN o SELLER) y los datos salen de la misma base.
 */
export const metadata: Metadata = {
  title: "Olivo Operaciones",
  description: "Venta, recepción, inventario y caja",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // Evita el zoom accidental al tocar campos durante una venta
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0a0a0a",
};

export default function OperacionesLayout({ children }: { children: React.ReactNode }) {
  return <BranchProvider>{children}</BranchProvider>;
}
