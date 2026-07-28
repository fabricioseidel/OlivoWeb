import type { Metadata } from "next";
import JsonLd from "@/components/seo/JsonLd";
import { groceryStoreSchema } from "@/lib/seo/schema";
import { BUSINESS } from "@/lib/seo/business";
import HomeClient from "./HomeClient";

export const metadata: Metadata = {
  metadataBase: new URL(BUSINESS.url),
  title: "Olivo Market Ñuñoa | Productos Venezolanos y Punto de Envíos",
  description:
    "Minimarket venezolano en Av. José Pedro Alessandri 2010, Ñuñoa. Harina PAN, quesos, pan de jamón y abarrotes. Somos punto de retiro y envío de MercadoLibre, Chilexpress, Bluexpress y Correos de Chile. Despacho a Ñuñoa y Macul.",
  alternates: { canonical: "/" },
  openGraph: {
    locale: "es_CL",
    siteName: BUSINESS.name,
    type: "website",
    title: "Olivo Market Ñuñoa | Productos Venezolanos y Punto de Envíos",
    description:
      "Minimarket venezolano y punto de paquetería en Ñuñoa: MercadoLibre, Chilexpress, Bluexpress y Correos de Chile.",
    url: "/",
  },
};

export default function Home() {
  // Único bloque GroceryStore de esta página (el otro vive en /tienda-nunoa)
  const images = BUSINESS.facadePhoto ? [BUSINESS.facadePhoto] : [];

  return (
    <>
      <JsonLd data={groceryStoreSchema(images)} />
      <HomeClient />
    </>
  );
}
