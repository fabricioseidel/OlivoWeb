import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-during-build.supabase.co";
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key-during-build";

export const supabase = createClient(url, key, {
  auth: { persistSession: false },
});
