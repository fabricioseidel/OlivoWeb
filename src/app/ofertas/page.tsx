import type { Metadata } from "next";
import JsonLd from "@/components/seo/JsonLd";
import { breadcrumbSchema } from "@/lib/seo/schema";
import { BUSINESS } from "@/lib/seo/business";
import OfertasClient from "./OfertasClient";

export const metadata: Metadata = {
  metadataBase: new URL(BUSINESS.url),
  title: "Ofertas y descuentos | Olivo Market Ñuñoa",
  description:
    "Productos del minimarket con precio rebajado en Olivo Market Ñuñoa: abarrotes, bebidas, snacks y más. Aprovecha los descuentos vigentes y recibe tu pedido en Ñuñoa, Macul, Peñalolén o San Joaquín.",
  alternates: { canonical: "/ofertas" },
  openGraph: {
    locale: "es_CL",
    siteName: BUSINESS.name,
    type: "website",
    title: "Ofertas y descuentos | Olivo Market Ñuñoa",
    description: "Productos del minimarket con precio rebajado y despacho en Ñuñoa.",
    url: "/ofertas",
  },
};

export default function OfertasPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Inicio", path: "/" },
          { name: "Ofertas", path: "/ofertas" },
        ])}
      />
      <OfertasClient />
    </>
  );
}
