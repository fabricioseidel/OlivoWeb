import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  // Select all columns to avoid errors if optional columns (e.g., banner_url) are missing
  const { data, error } = await supabase
    .from("settings")
    .select("*")
    .eq("id", true)
    .single();

  if (error && error.code !== "PGRST116") {
    // PGRST116 = row not found (si aún no existe)
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const resp = {
    storeName: data?.store_name ?? "Mi Tienda",
    currency: data?.currency ?? "CLP",
    theme: data?.theme ?? "light",
    logoUrl: data?.logo_url ?? null,
    updatedAt: data?.updated_at ?? null,
    // New: nested appearance object for UI deep-merge and homepage banner
    appearance: {
      bannerUrl: (data as any)?.banner_url ?? null,
      logoUrl: data?.logo_url ?? null,
      // Optional if column exists
      faviconUrl: (data as any)?.favicon_url ?? null,
    },
  } as const;

  return NextResponse.json(resp);
}

export async function PATCH(req: Request) {
  const body = await req.json().catch(() => ({}));

  // Accept both legacy flat fields and nested sectioned payloads from the admin UI
  const general = body.general ?? {};
  const appearance = body.appearance ?? {};

  const payload: Record<string, any> = {
    id: true,
    store_name: general.storeName ?? body.storeName ?? null,
    currency: general.storeCurrency ?? body.currency ?? null,
    theme: body.theme ?? null,
    logo_url: appearance.logoUrl ?? body.logoUrl ?? null,
    // New optional columns for richer appearance
    banner_url: appearance.bannerUrl ?? body.bannerUrl ?? null,
    favicon_url: appearance.faviconUrl ?? body.faviconUrl ?? null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabaseAdmin
    .from("settings")
    .upsert([payload], { onConflict: "id" });

  if (error) {
    // Fallback: some columns (e.g., banner_url, favicon_url) might not exist yet
    const minimalPayload = {
      id: true,
      store_name: payload.store_name ?? null,
      currency: payload.currency ?? null,
      theme: payload.theme ?? null,
      logo_url: payload.logo_url ?? null,
      updated_at: payload.updated_at,
    } as const;

    const { error: fallbackErr } = await supabaseAdmin
      .from("settings")
      .upsert([minimalPayload], { onConflict: "id" });

    if (fallbackErr) {
      return NextResponse.json({ error: fallbackErr.message }, { status: 500 });
    }
  }
  return NextResponse.json({ ok: true });
}
