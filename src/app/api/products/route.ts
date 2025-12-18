import { NextResponse } from "next/server";
import { fetchAllProducts } from "@/services/products";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { successResponse, errorResponse } from "@/lib/api-response";

async function readJsonBody(req: Request) {
  const text = await req.text();
  if (!text || !text.trim()) {
    console.warn("/api/products POST: empty body", {
      contentType: req.headers.get("content-type"),
      contentLength: req.headers.get("content-length"),
      referer: req.headers.get("referer"),
      userAgent: req.headers.get("user-agent"),
    });
    throw Object.assign(new Error("Empty request body"), { statusCode: 400 });
  }

  try {
    return JSON.parse(text);
  } catch (e: any) {
    console.warn("/api/products POST: invalid JSON", {
      contentType: req.headers.get("content-type"),
      contentLength: req.headers.get("content-length"),
      referer: req.headers.get("referer"),
      userAgent: req.headers.get("user-agent"),
      error: String(e?.message || e),
    });
    throw Object.assign(new Error("Invalid JSON body"), { statusCode: 400 });
  }
}

async function upsertProductsWithColumnFallback(payloadsInput: any[]) {
  let payloads = (Array.isArray(payloadsInput) ? payloadsInput : []).map((p) => ({ ...(p ?? {}) }));
  let lastError: any;

  for (let attempt = 0; attempt < 8; attempt++) {
    const { error } = await supabaseAdmin.from('products').upsert(payloads, { onConflict: 'barcode' });
    if (!error) return;

    lastError = error;

    // Example: PGRST204: Could not find the 'tax_rate' column of 'products' in the schema cache
    if (error?.code === 'PGRST204' && typeof error?.message === 'string') {
      const match = error.message.match(/Could not find the '([^']+)' column of 'products'/);
      const missingColumn = match?.[1];
      if (missingColumn) {
        let changed = false;
        payloads = payloads.map((p) => {
          if (p && Object.prototype.hasOwnProperty.call(p, missingColumn)) {
            const next = { ...p };
            delete (next as any)[missingColumn];
            changed = true;
            return next;
          }
          return p;
        });

        if (changed) continue;
      }
    }

    throw error;
  }

  throw lastError;
}

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

    const body = await readJsonBody(req);
    const items = Array.isArray(body?.items) ? body.items : [body];

    if (!Array.isArray(items) || items.length === 0) {
      return errorResponse(new Error("Missing items"), 400);
    }

    for (const item of items) {
      if (!item?.barcode) {
        return errorResponse(new Error('Missing barcode'), 400);
      }
    }

    // Using supabaseAdmin to bypass RLS policies that might block client-side inserts
    await upsertProductsWithColumnFallback(items);

    return successResponse({ success: true });
  } catch (e: any) {
    if (e?.statusCode && typeof e.statusCode === "number") {
      return errorResponse(e, e.statusCode);
    }
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
