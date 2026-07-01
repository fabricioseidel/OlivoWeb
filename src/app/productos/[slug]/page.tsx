import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { supabaseServer } from "@/lib/supabase-server";
import { slugify } from "@/utils/string-utils";
import ProductDetailClient from "./ProductDetailClient";

// El slug se deriva del nombre (slugify), no existe como columna: se busca
// sobre la lista de productos activos, cacheada 5 min para no golpear la BD
// en cada request de metadata.
const getActiveProductsForMeta = unstable_cache(
  async () => {
    const { data } = await supabaseServer
      .from("products")
      .select("name, description, image_url, sale_price")
      .eq("is_active", true)
      .limit(1000);
    return data || [];
  },
  ["products-meta"],
  { revalidate: 300 }
);

async function findProductBySlug(slug: string) {
  const products = await getActiveProductsForMeta();
  return products.find((p) => slugify(p.name || "") === slug) ?? null;
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const product = await findProductBySlug(slug);

  if (!product) {
    return { title: "Producto no encontrado | Olivo Market" };
  }

  const title = `${product.name} | Olivo Market`;
  const description =
    product.description?.slice(0, 160) ||
    `Compra ${product.name} en Olivo Market — productos venezolanos premium en Chile.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      ...(product.image_url ? { images: [{ url: product.image_url }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function ProductDetailPage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const product = await findProductBySlug(slug);

  // JSON-LD Product para rich snippets en buscadores
  const jsonLd = product
    ? {
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.name,
        ...(product.description ? { description: product.description } : {}),
        ...(product.image_url ? { image: product.image_url } : {}),
        offers: {
          "@type": "Offer",
          price: product.sale_price ?? 0,
          priceCurrency: "CLP",
          availability: "https://schema.org/InStock",
        },
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
      <ProductDetailClient slug={slug} />
    </>
  );
}
