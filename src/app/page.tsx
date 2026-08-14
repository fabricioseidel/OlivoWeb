import type { Metadata } from "next";
import JsonLd from "@/components/seo/JsonLd";
import { groceryStoreSchema } from "@/lib/seo/schema";
import { BUSINESS } from "@/lib/seo/business";
import HomeClient from "./HomeClient";
import { getStoreSettingsServer } from "@/server/settings.server";

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

// La portada depende de la configuración guardada, así que no puede ser
// estática; se revalida cada minuto, igual que el cache de /api/settings.
export const revalidate = 60;

export default async function Home() {
  // Único bloque GroceryStore de esta página (el otro vive en /tienda-nunoa)
  const images = BUSINESS.facadePhoto ? [BUSINESS.facadePhoto] : [];

  // Los bloques se leen en el servidor para que el HTML inicial ya traiga el
  // hero configurado. Si se dejan al hook de cliente, la portada muestra
  // primero el hero por defecto y lo reemplaza al llegar la configuración.
  const settings = await getStoreSettingsServer();
  const initialBlocks = settings?.appearance?.blocks ?? null;

  return (
    <>
      <JsonLd data={groceryStoreSchema(images)} />
      <HomeClient initialBlocks={initialBlocks} />
    </>
  );
}
