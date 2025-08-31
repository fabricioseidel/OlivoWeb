import { NextResponse } from "next/server";
import { fetchAllProducts, mapSupaToUI, type ProductUI } from "@/services/products";

export async function GET() {
  try {
    const items = await fetchAllProducts();
    // For compatibility with components that expect image_url instead of image, map shape
    const result = (items || []).map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: p.price,
      sale_price: undefined,
      image_url: (p as any).image,
      categories: p.categories,
      stock: p.stock,
      featured: p.featured,
    }));
    return NextResponse.json({ items: result });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Error" }, { status: 500 });
  }
}
