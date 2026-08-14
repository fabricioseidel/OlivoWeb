import type { Metadata } from "next";
import JsonLd from "@/components/seo/JsonLd";
import { groceryStoreSchema } from "@/lib/seo/schema";
import { BUSINESS } from "@/lib/seo/business";
import HomeClient from "./HomeClient";
import { getStoreSettingsServer } from "@/server/settings.server";

// Respaldos escritos para SEO local: nombran la comuna, el rubro y el segundo
// servicio (paquetería), que es lo que se busca en esta zona. Si el admin
// define título o descripción en Configuración → SEO, mandan los suyos.
const FALLBACK_TITLE = "Olivo Market Ñuñoa | Productos Venezolanos y Punto de Envíos";
const FALLBACK_DESCRIPTION =
  "Minimarket venezolano en Av. José Pedro Alessandri 2010, Ñuñoa. Harina PAN, quesos, pan de jamón y abarrotes. Somos punto de retiro y envío de MercadoLibre, Chilexpress, Bluexpress y Correos de Chile. Despacho a Ñuñoa y Macul.";

/**
 * La portada tenía el título y la descripción escritos a mano, así que la
 * pestaña SEO del panel no afectaba en nada a la página más importante del
 * sitio. Ahora se leen de la configuración, con los respaldos de arriba.
 */
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getStoreSettingsServer();

  const title = settings?.seoTitle?.trim() || FALLBACK_TITLE;
  const description = settings?.seoDescription?.trim() || FALLBACK_DESCRIPTION;
  const ogImage = settings?.ogImageUrl?.trim();

  return {
    metadataBase: new URL(BUSINESS.url),
    title,
    description,
    ...(settings?.seoKeywords?.trim() ? { keywords: settings.seoKeywords } : {}),
    alternates: { canonical: "/" },
    openGraph: {
      locale: "es_CL",
      siteName: BUSINESS.name,
      type: "website",
      title,
      description,
      url: "/",
      ...(ogImage
        ? {
            images: [
              {
                url: ogImage,
                width: settings?.ogImageWidth || 1200,
                height: settings?.ogImageHeight || 630,
                alt: title,
              },
            ],
          }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  };
}

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
