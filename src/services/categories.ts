import { supabase } from "@/lib/supabase";

export type Category = { name: string };

export async function fetchAllCategories(): Promise<string[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("name")
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return (data || []).map((c: any) => c.name);
}

export async function upsertCategory(name: string) {
  const clean = name.trim();
  if (!clean) throw new Error("Nombre de categoría vacío");
  const { error } = await supabase.from("categories").upsert([{ name: clean }], {
    onConflict: "name",
  });
  if (error) throw new Error(error.message);
}

export async function deleteCategory(name: string) {
  const clean = name.trim();
  const { error } = await supabase.from("categories").delete().eq("name", clean);
  if (error) throw new Error(error.message);
}
