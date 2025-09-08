import { NextResponse } from "next/server";
import { fetchAllProducts, mapSupaToUI, type ProductUI } from "@/services/products";

export async function GET() {
  try {
    const items = await fetchAllProducts();
    // Using fallback images since products table doesn't have image_url column
    const result = (items || []).map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: p.price,
      sale_price: undefined,
      image: (p as any).image, // Use image field for consistency
      categories: p.categories,
      stock: p.stock,
      featured: p.featured,
    }));
    return NextResponse.json({ items: result });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Error" }, { status: 500 });
  }
}
