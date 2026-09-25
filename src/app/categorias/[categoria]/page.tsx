import type { Metadata } from "next";
import JsonLd from "@/components/seo/JsonLd";
import { breadcrumbSchema } from "@/lib/seo/schema";
import { BUSINESS } from "@/lib/seo/business";
import { slugify } from "@/utils/string-utils";
import CategoriaClient from "./CategoriaClient";

/**
 * Convierte el slug de la URL en algo presentable ("frutos-secos" →
 * "Frutos secos"). No se consulta la base aquí: la metadata debe resolverse
 * rápido y el nombre exacto lo pone el cliente cuando carga los productos.
 */
function titleFromSlug(slug: string): string {
  const words = decodeURIComponent(slug).replace(/-/g, " ").trim();
  if (!words) return "Categoría";
  return words.charAt(0).toUpperCase() + words.slice(1);
}

// Cada categoría es una página propia para el buscador: quien busca
// "galletas venezolanas ñuñoa" debe encontrar la categoría, no la portada.
export async function generateMetadata(
  { params }: { params: Promise<{ categoria: string }> }
): Promise<Metadata> {
  const { categoria } = await params;
  const nombre = titleFromSlug(categoria);
  const canonical = `/categorias/${slugify(decodeURIComponent(categoria))}`;

  const title = `${nombre} venezolanos en Ñuñoa | Olivo Market`;
  const description = `${nombre} de origen venezolano en Olivo Market Ñuñoa. Compra online con despacho a Ñuñoa, Macul, Peñalolén y San Joaquín, o retira en Av. José Pedro Alessandri 2010.`;

  return {
    metadataBase: new URL(BUSINESS.url),
    title,
    description,
    alternates: { canonical },
    openGraph: {
      locale: "es_CL",
      siteName: BUSINESS.name,
      type: "website",
      title,
      description,
      url: canonical,
    },
  };
}

export default async function CategoriaPage(
  { params }: { params: Promise<{ categoria: string }> }
) {
  const { categoria } = await params;
  const nombre = titleFromSlug(categoria);

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Inicio", path: "/" },
          { name: "Categorías", path: "/categorias" },
          { name: nombre, path: `/categorias/${slugify(decodeURIComponent(categoria))}` },
        ])}
      />
      <CategoriaClient />
    </>
  );
}
