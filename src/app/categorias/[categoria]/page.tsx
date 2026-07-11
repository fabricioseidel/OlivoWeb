import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { supabaseServer } from "@/lib/supabase-server";
import { slugify } from "@/utils/string-utils";
import CategoryDetailClient from "./CategoryDetailClient";

// Antes esta ruta era 100% cliente: cada categoría (harinas, dulces,
// bebidas...) mostraba el mismo <title>/descripción genérico heredado del
// layout de /categorias — señal de contenido duplicado para buscadores.
// Resolvemos el nombre real de la categoría server-side para dar a cada
// URL su propio título/descripción/canonical.
const getActiveCategories = unstable_cache(
  async () => {
    const { data } = await supabaseServer
      .from("categories")
      .select("name, slug, description")
      .eq("is_active", true);
    return data || [];
  },
  ["categories-meta"],
  { revalidate: 300 }
);

async function findCategoryBySlug(slug: string) {
  const categories = await getActiveCategories();
  const target = decodeURIComponent(slug || "").toLowerCase();
  return categories.find((c) => (c.slug || slugify(c.name || "")).toLowerCase() === target) ?? null;
}

export async function generateMetadata(
  { params }: { params: Promise<{ categoria: string }> }
): Promise<Metadata> {
  const { categoria } = await params;
  const category = await findCategoryBySlug(categoria);
  const name = category?.name || decodeURIComponent(categoria || "");

  const title = `${name} | Olivo Market`;
  const description =
    category?.description ||
    `Descubre productos de ${name} en Olivo Market — productos venezolanos premium en Chile.`;

  return {
    title,
    description,
    alternates: { canonical: `/categorias/${categoria}` },
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary", title, description },
  };
}

export default async function CategoryDetailPage(
  { params }: { params: Promise<{ categoria: string }> }
) {
  const { categoria } = await params;
  const category = await findCategoryBySlug(categoria);

  const jsonLd = category
    ? {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: category.name,
        ...(category.description ? { description: category.description } : {}),
      }
    : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <CategoryDetailClient />
    </>
  );
}
