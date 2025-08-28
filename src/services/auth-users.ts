import { supabase } from "@/lib/supabase";

export type DbUser = {
  id: string;
  email: string;
  password_hash: string;
  name: string | null;
  role: string | null;
};

export async function getUserByEmail(email: string): Promise<DbUser | null> {
  const { data, error } = await supabase
    .from("users")
    .select("id,email,password_hash,name,role")
    .eq("email", email)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as any) || null;
}
