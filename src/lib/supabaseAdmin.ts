import { createClient } from '@supabase/supabase-js';

// Server-only Supabase client using the Service Role key (bypasses RLS). Never expose this on the client.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-during-build.supabase.co";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key-during-build";

export const supabaseAdmin = createClient(url, serviceKey, {
  auth: { persistSession: false },
});
