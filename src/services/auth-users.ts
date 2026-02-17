import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type DbUser = {
  id: string;
  email: string;
  password_hash: string;
  name: string | null;
  role: string | null;
};

export async function getUserByEmail(email: string): Promise<DbUser | null> {
  const __dev = process.env.NODE_ENV !== 'production';
  if (__dev) console.log("[AUTH-SERVICE] Looking up email:", email);
  
  // First, let's check if there are any users in the table at all
  const { data: allUsers, error: countError } = await supabaseAdmin
    .from("users")
    .select("email", { count: 'exact', head: true });
  if (__dev) console.log("[AUTH-SERVICE] Total users in table:", { count: allUsers, error: countError?.message });
  
  // Also check recent users to see the actual email format
  const { data: recentUsers } = await supabaseAdmin
    .from("users")
    .select("email,id")
    .order("created_at", { ascending: false })
    .limit(3);
  if (__dev) console.log("[AUTH-SERVICE] Recent users:", recentUsers);
  
  // Try different column combinations to match any schema
  const queries = [
    "id,email,password_hash,name,role",
    "id,email,password,name,role", 
    "*", // Get all columns to see what's available
  ];
  
  for (let i = 0; i < queries.length; i++) {
    const sel = queries[i];
    if (__dev) console.log(`[AUTH-SERVICE] Trying query ${i + 1}:`, sel);
    
    // Use admin client to bypass RLS
    const { data, error } = await supabaseAdmin
      .from("users")
      .select(sel)
      .eq("email", email)
      .maybeSingle();
    
    if (__dev) console.log(`[AUTH-SERVICE] Query ${i + 1} result:`, { 
      data: data ? Object.keys(data) : null, 
      error: error?.message,
      fullData: data
    });
    
    if (!error && data) {
      // Normalize the data to our expected format
      const normalized = {
        id: (data as any).id,
        email: (data as any).email,
        password_hash: (data as any).password_hash || (data as any).password || (data as any).passwordHash,
        name: (data as any).name,
        role: (data as any).role
      };
      
      if (__dev) console.log("[AUTH-SERVICE] Normalized result:", {
        id: normalized.id,
        email: normalized.email,
        hasHash: !!normalized.password_hash,
        hashLength: normalized.password_hash?.length,
        role: normalized.role
      });
      
      return normalized as DbUser;
    }
  }
  
  if (__dev) console.log("[AUTH-SERVICE] No user found for email:", email);
  return null;
}
