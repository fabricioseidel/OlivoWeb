import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabase
    .from("settings")
    .select("store_name, currency, theme, logo_url, updated_at")
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
  };

  return NextResponse.json(resp);
}

export async function PATCH(req: Request) {
  const body = await req.json().catch(() => ({}));
  const payload = {
    id: true,
    store_name: body.storeName ?? null,
    currency: body.currency ?? null,
    theme: body.theme ?? null,
    logo_url: body.logoUrl ?? null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("settings")
    .upsert([payload], { onConflict: "id" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
