import { supabase } from "@/lib/supabase";

export type StoreSettings = {
  storeName: string;
  currency: string;
  theme: "light" | "dark";
  logoUrl?: string | null;
  updatedAt?: string;
};

const DEFAULTS: StoreSettings = {
  storeName: "Mi Tienda",
  currency: "CLP",
  theme: "light",
  logoUrl: null,
};

export async function loadSettings(): Promise<StoreSettings> {
  const { data, error } = await supabase
    .from("settings")
    .select("store_name, currency, theme, logo_url, updated_at")
    .eq("id", true)
    .single();

  if (error) {
    // Fallback sin romper la UI
    return DEFAULTS;
  }
  return {
    storeName: data.store_name ?? DEFAULTS.storeName,
    currency: data.currency ?? DEFAULTS.currency,
    theme: (data.theme as "light" | "dark") ?? DEFAULTS.theme,
    logoUrl: data.logo_url ?? null,
    updatedAt: data.updated_at ?? undefined,
  };
}

export async function saveSettings(s: Partial<StoreSettings>) {
  const payload = {
    id: true,
    store_name: s.storeName ?? null,
    currency: s.currency ?? null,
    theme: s.theme ?? null,
    logo_url: s.logoUrl ?? null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("settings")
    .upsert([payload], { onConflict: "id" });
  if (error) throw new Error(error.message);
}
