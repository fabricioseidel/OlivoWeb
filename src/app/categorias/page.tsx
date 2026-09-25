import type { Metadata } from "next";
import JsonLd from "@/components/seo/JsonLd";
import { breadcrumbSchema } from "@/lib/seo/schema";
import { BUSINESS } from "@/lib/seo/business";
import CategoriasClient from "./CategoriasClient";

export const metadata: Metadata = {
  metadataBase: new URL(BUSINESS.url),
  title: "Categorías de productos | Olivo Market Ñuñoa",
  description:
    "Explora nuestro minimarket venezolano por categoría: abarrotes, bebidas, dulces, lácteos, snacks y más. Compra online con despacho en Ñuñoa o retira en tienda.",
  alternates: { canonical: "/categorias" },
  openGraph: {
    locale: "es_CL",
    siteName: BUSINESS.name,
    type: "website",
    title: "Categorías de productos | Olivo Market Ñuñoa",
    description: "Abarrotes, bebidas, dulces, lácteos y snacks venezolanos en Ñuñoa.",
    url: "/categorias",
  },
};

export default function CategoriasPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Inicio", path: "/" },
          { name: "Categorías", path: "/categorias" },
        ])}
      />
      <CategoriasClient />
    </>
  );
}
