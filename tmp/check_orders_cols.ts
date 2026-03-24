import { supabaseAdmin } from './src/lib/supabaseAdmin';

async function run() {
  const { data, error } = await supabaseAdmin.rpc('run_sql', {
    sql: "SELECT column_name FROM information_schema.columns WHERE table_name = 'orders'"
  });
  if (error) {
    console.error(error);
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}

run();
