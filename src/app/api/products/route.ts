import { NextResponse } from "next/server";
import { fetchAllProducts, isProductVisible } from "@/services/products";
import { supabaseServer } from "@/lib/supabase-server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { requireApiAdminOrSeller } from "@/lib/api-auth";
import { STOCK_REASON, setStockLevels } from "@/server/inventory.service";

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
    const { error } = await supabaseServer.from('products').upsert(payloads, { onConflict: 'barcode' });
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
    // Solo productos visibles: activos y con nombre, categoría, precio y foto
    const result = (items || [])
      .filter((p) => p.isActive !== false && isProductVisible(p))
      .map((p) => ({
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
    // Cache CDN corto para el catálogo público
    return NextResponse.json(
      { items: result },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
    );
  } catch (e: any) {
    return errorResponse(e);
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireApiAdminOrSeller();
    if (!auth.ok) return auth.response;

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

    // `products.stock` es un valor derivado de `branch_stock`: no puede viajar
    // en el upsert. Antes sí lo hacía, y como el navegador manda el producto
    // completo, guardar cualquier campo reescribía el stock con el valor que
    // el cliente tenía cacheado — pisando recepciones y ventas recién hechas.
    // Acá se separa: el producto se guarda sin stock y la cantidad, si viene,
    // se aplica después como ajuste de inventario.
    const stockTargets = new Map<string, number>();
    const payloads = items.map((item: any) => {
      const { stock, ...rest } = item ?? {};
      if (stock !== undefined && stock !== null && Number.isFinite(Number(stock))) {
        stockTargets.set(String(rest.barcode), Number(stock));
      }
      return rest;
    });

    // Using supabaseServer to bypass RLS policies that might block client-side inserts
    await upsertProductsWithColumnFallback(payloads);

    const stockResult = await setStockLevels(
      [...stockTargets].map(([barcode, target]) => ({ barcode, target })),
      { reason: STOCK_REASON.MANUAL_ADJUSTMENT }
    );

    if (!stockResult.ok) {
      console.error('/api/products POST: ajuste de stock falló', stockResult.error);
    }

    return successResponse({
      success: true,
      ...(stockResult.ok ? {} : { stockError: stockResult.error }),
    });
  } catch (e: any) {
    if (e?.statusCode && typeof e.statusCode === "number") {
      return errorResponse(e, e.statusCode);
    }
    return errorResponse(e);
  }
}

export async function DELETE(req: Request) {
  try {
    const auth = await requireApiAdminOrSeller();
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return errorResponse(new Error("Missing id"), 400);
    }

    const { error } = await supabaseServer.from('products').delete().eq('barcode', id);
    
    if (error) throw error;

    return successResponse({ success: true });
  } catch (e: any) {
    return errorResponse(e);
  }
}
