import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// GET /api/categories -> { categories: string[] }
export async function GET() {
  const { data, error } = await supabase
    .from("categories")
    // select all columns to be tolerant with column names across environments
    .select('*')
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const mapped = (data || []).map((c: any) => ({
    id: String(c.id ?? c.name ?? ""),
    name: c.name ?? c.label ?? "",
    slug:
      c.slug ?? c.sku ?? (c.name ? String(c.name).toLowerCase().replace(/[^a-z0-9]+/gi, "-") : undefined),
    description: c.description ?? c.desc ?? undefined,
    image: c.image ?? c.img ?? c.image_url ?? undefined,
    isActive:
      typeof c.is_active === "boolean"
        ? c.is_active
        : typeof c.isActive === "boolean"
        ? c.isActive
        : true,
  }));

  return NextResponse.json(mapped);
}

// POST /api/categories { name }
export async function POST(req: Request) {
  const { name } = await req.json().catch(() => ({}));
  const clean = String(name || "").trim();
  if (!clean) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("categories")
    .upsert([{ name: clean }], { onConflict: "name" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

// DELETE /api/categories?name=...
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name");
  if (!name) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }

  const { error } = await supabase.from("categories").delete().eq("name", name);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
