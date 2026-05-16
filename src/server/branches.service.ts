import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { Branch } from "@/types";

export async function getBranches(): Promise<Branch[]> {
  const supabase = supabaseAdmin;
  const { data, error } = await supabase
    .from("branches")
    .select("*")
    .eq("is_active", true)
    .order("is_default", { ascending: false });
  if (error) throw new Error(error.message);
  return data as Branch[];
}

export async function getDefaultBranch(): Promise<Branch> {
  const supabase = supabaseAdmin;
  const { data, error } = await supabase
    .from("branches")
    .select("*")
    .eq("is_default", true)
    .single();
  if (error) throw new Error(error.message);
  return data as Branch;
}
