import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { supabaseServer } from "@/lib/supabase-server";
import { slugify } from "@/utils/string-utils";
import ProductDetailClient from "./ProductDetailClient";
import JsonLd from "@/components/seo/JsonLd";
import { productSchema, breadcrumbSchema } from "@/lib/seo/schema";
import { hasRealImage, isProductVisible, mapSupaToUI } from "@/services/products";
import { precioEfectivo } from "@/lib/pricing";
import type { SupaProduct } from "@/types";

// El slug se deriva del nombre (slugify), no existe como columna: se busca
// sobre la lista de productos activos, cacheada 5 min para no golpear la BD
// en cada request de metadata. Trae lo justo para aplicar la misma regla de
// visibilidad que la tienda y para declarar precio y stock reales.
const getActiveProductsForMeta = unstable_cache(
  async () => {
    const { data } = await supabaseServer
      .from("products")
      .select(
        "barcode, name, description, image_url, category, sale_price, offer_price, offer_ends_at, purchase_price, stock, is_active, features, bundle_config"
      )
      .eq("is_active", true)
      .limit(2000);
    return (data || []) as SupaProduct[];
  },
  ["products-meta-v2"],
  { revalidate: 300 }
);

async function findProductBySlug(slug: string) {
  const products = await getActiveProductsForMeta();
  const row = products.find((p) => slugify(p.name || "") === slug);
  return row ? mapSupaToUI(row) : null;
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const product = await findProductBySlug(slug);

  if (!product) {
    return { title: "Producto no encontrado | Olivo Market", robots: { index: false, follow: true } };
  }

  // Un producto que la tienda oculta (sin foto, sin costo, sin categoría…) no
  // debe quedar indexado: el buscador mandaría gente a una ficha incompleta.
  const visible = isProductVisible(product);

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
      ...(hasRealImage(product) ? { images: [{ url: product.image }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    ...(visible ? {} : { robots: { index: false, follow: true } }),
  };
}

export default async function ProductDetailPage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const product = await findProductBySlug(slug);

  // JSON-LD Product + BreadcrumbList para rich snippets en buscadores. El
  // precio es el que se cobra (oferta vigente incluida) y la disponibilidad
  // sale del stock; en un pack el stock se calcula de sus componentes y acá
  // no se conoce, así que no se declara.
  const visible = product ? isProductVisible(product) : false;
  const jsonLd = product && visible
    ? productSchema({
        name: product.name,
        description: product.description,
        image: hasRealImage(product) ? product.image : null,
        price: precioEfectivo(product.price, product.offerPrice),
        slug,
        inStock: product.bundle_config?.isBundle ? undefined : product.stock > 0,
      })
    : null;

  const breadcrumbs = product
    ? breadcrumbSchema([
        { name: "Inicio", path: "/" },
        { name: "Productos", path: "/productos" },
        { name: product.name, path: `/productos/${slug}` },
      ])
    : null;

  return (
    <>
      <JsonLd data={jsonLd} />
      <JsonLd data={breadcrumbs} />
      <ProductDetailClient slug={slug} />
    </>
  );
}
