import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// GET /api/categories -> { categories: string[] }
export async function GET() {
  const { data, error } = await supabase
    .from("categories")
    // select all columns to be tolerant with column names across environments
    .select('*')
    .order("name", { ascending: true });

  if (error) {
    console.error("Supabase Error in categories:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fetch product counts
  const { data: productsData, error: productsError } = await supabase
    .from("products")
    .select("category");

  const productCounts: Record<string, number> = {};
  if (!productsError && productsData) {
    productsData.forEach((p: any) => {
      if (p.category) {
        const cats = String(p.category).split(/[,/|]/).map((c) => c.trim().toLowerCase()).filter(Boolean);
        cats.forEach(cat => {
          productCounts[cat] = (productCounts[cat] || 0) + 1;
        });
      }
    });
  }

  const mapped = (data || []).map((c: any) => {
    const rawName = (c.name || "").toLowerCase().trim();
    // Buscar por nombre de categoría en el mapeo de productos
    const count = productCounts[rawName] || 0;

    return {
      id: String(c.id ?? ""),
      name: c.name ?? "",
      slug:
        c.slug ?? c.sku ?? (c.name ? String(c.name).toLowerCase().replace(/[^a-z0-9]+/gi, "-") : undefined),
      description: c.description ?? c.desc ?? undefined,
      image: c.image_url ?? c.image ?? c.img ?? undefined,
      isActive:
        typeof c.is_active === "boolean"
          ? c.is_active
          : typeof c.isActive === "boolean"
            ? c.isActive
            : true,
      productsCount: count,
    };
  }); // Mostrar TODAS las categorías en admin (sin filtrar por productsCount)

  return NextResponse.json(mapped);
}

// POST /api/categories { name }
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({} as any));
  const cleanName = String(body?.name || "").trim();
  if (!cleanName) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }

  // Build insert/upsert payload using columns we know exist
  const payload: any = { name: cleanName };
  if (typeof body?.isActive === 'boolean') payload.is_active = body.isActive;
  if (typeof body?.image === 'string' && body.image) payload.image_url = body.image;
  // Slug / description are optional across environments; include if present
  if (typeof body?.slug === 'string' && body.slug) payload.slug = body.slug;
  if (typeof body?.description === 'string') payload.description = body.description;

  const { data, error } = await supabaseAdmin
    .from('categories')
    .upsert(payload, { onConflict: 'name' })
    .select('*')
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const c: any = data || payload;
  const mapped = {
    id: String(c.id ?? c.name ?? ''),
    name: c.name ?? '',
    slug: c.slug ?? (c.name ? String(c.name).toLowerCase().replace(/[^a-z0-9]+/gi, '-') : ''),
    description: c.description ?? undefined,
    image: c.image ?? c.img ?? c.image_url ?? undefined,
    isActive: typeof c.is_active === 'boolean' ? c.is_active : true,
    productsCount: 0,
  };
  return NextResponse.json(mapped);
}

// DELETE /api/categories?name=...
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name");
  if (!name) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("categories").delete().eq("name", name);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
