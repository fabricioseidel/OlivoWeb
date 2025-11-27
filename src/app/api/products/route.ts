import { NextResponse } from "next/server";
import { fetchAllProducts } from "@/services/products";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { successResponse, errorResponse } from "@/lib/api-response";

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
      image: p.image, // Use image field from ProductUI
      categories: p.categories,
      stock: p.stock,
      featured: p.featured,
    }));
    return successResponse({ items: result });
  } catch (e: any) {
    return errorResponse(e);
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return errorResponse(new Error("Unauthorized"), 401);
    }

    const body = await req.json();
    
    // Using supabaseAdmin to bypass RLS policies that might block client-side inserts
    const { error } = await supabaseAdmin.from('products').upsert(
      [body],
      { onConflict: 'barcode' }
    );

    if (error) throw error;

    return successResponse({ success: true });
  } catch (e: any) {
    return errorResponse(e);
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return errorResponse(new Error("Unauthorized"), 401);
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return errorResponse(new Error("Missing id"), 400);
    }

    const { error } = await supabaseAdmin.from('products').delete().eq('barcode', id);
    
    if (error) throw error;

    return successResponse({ success: true });
  } catch (e: any) {
    return errorResponse(e);
  }
}
