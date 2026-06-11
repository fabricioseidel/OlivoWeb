import type { Metadata } from "next";
import { supabaseServer } from "@/lib/supabase-server";
import { slugify } from "@/utils/string-utils";
import ProductDetailClient from "./ProductDetailClient";

// El slug se deriva del nombre (slugify), no existe como columna: se buscan
// los nombres y se compara el slug generado.
async function findProductBySlug(slug: string) {
  const { data } = await supabaseServer
    .from("products")
    .select("name, description, image_url, sale_price")
    .eq("is_active", true)
    .limit(1000);
  return (data || []).find((p) => slugify(p.name || "") === slug) ?? null;
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
  return <ProductDetailClient slug={slug} />;
}
