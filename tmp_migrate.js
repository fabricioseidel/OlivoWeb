const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function migrate() {
  console.log('Running migration...');
  const { error: error1 } = await supabaseAdmin.rpc('run_sql', {
    sql: 'ALTER TABLE settings ADD COLUMN IF NOT EXISTS hero_title TEXT;'
  });
  if (error1) console.error('Error adding hero_title:', error1);

  const { error: error2 } = await supabaseAdmin.rpc('run_sql', {
    sql: 'ALTER TABLE settings ADD COLUMN IF NOT EXISTS hero_description TEXT;'
  });
  if (error2) console.error('Error adding hero_description:', error2);

  console.log('Migration finished.');
}

migrate();
