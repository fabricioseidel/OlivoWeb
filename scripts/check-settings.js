/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-require-imports */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabaseAdmin = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

async function run() {
  try {
    console.log('👉 Checking existing settings row...');
    const { data, error } = await supabaseAdmin
      .from('settings')
      .select('id, store_name, primary_color, accent_color, updated_at, payment_methods, social_media')
      .eq('id', true)
      .maybeSingle();

    if (error) {
      console.error('❌ Error reading settings:', error.message || error);
    } else if (!data) {
      console.log('ℹ️ No settings row found (id=true).');
    } else {
      console.log('✅ Settings row found:', data);
    }

    console.log('\n👉 Attempting a test upsert (will set primary_color temporarily)...');
    const testPayload = {
      id: true,
      primary_color: '#3366FF',
      updated_at: new Date().toISOString(),
    };

    const { error: upsertErr } = await supabaseAdmin
      .from('settings')
      .upsert([testPayload], { onConflict: 'id' });

    if (upsertErr) {
      console.error('❌ Upsert failed:', upsertErr.message || upsertErr);
    } else {
      console.log('✅ Upsert succeeded. Reading back value...');
      const { data: after, error: afterErr } = await supabaseAdmin
        .from('settings')
        .select('id, primary_color, updated_at')
        .eq('id', true)
        .maybeSingle();
      if (afterErr) console.error('❌ Read after upsert error:', afterErr.message || afterErr);
      else console.log('🔁 After upsert:', after);
    }
  } catch (err) {
    console.error('❌ Unexpected error:', err.message || err);
  }
}

run();
