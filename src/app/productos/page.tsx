import type { Metadata } from "next";
import JsonLd from "@/components/seo/JsonLd";
import { breadcrumbSchema } from "@/lib/seo/schema";
import { BUSINESS } from "@/lib/seo/business";
import ProductosClient from "./ProductosClient";

export const metadata: Metadata = {
  metadataBase: new URL(BUSINESS.url),
  title: "Catálogo del minimarket | Olivo Market Ñuñoa",
  description:
    "Más de 700 productos: abarrotes, bebidas, lácteos, panadería, helados, snacks, dulces y aseo, más una selección venezolana. Compra online con despacho a Ñuñoa, Macul, Peñalolén y San Joaquín, o retira en Av. José Pedro Alessandri 2010.",
  alternates: { canonical: "/productos" },
  openGraph: {
    locale: "es_CL",
    siteName: BUSINESS.name,
    type: "website",
    title: "Catálogo de productos venezolanos | Olivo Market Ñuñoa",
    description:
      "Harina PAN, quesos, dulces, bebidas y abarrotes venezolanos con despacho en Ñuñoa y comunas vecinas.",
    url: "/productos",
  },
};

export default function ProductosPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Inicio", path: "/" },
          { name: "Productos", path: "/productos" },
        ])}
      />
      <ProductosClient />
    </>
  );
}
