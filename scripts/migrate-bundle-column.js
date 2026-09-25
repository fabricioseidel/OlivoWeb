require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('Faltan variables de entorno NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

async function checkBundleColumn() {
  console.log('Verificando columna bundle_config en la tabla products...');
  const { data, error } = await supabase
    .from('products')
    .select('barcode, bundle_config')
    .limit(1);

  if (error) {
    console.log('Respuesta/Error de Supabase:', error.message);
    if (error.message.includes('bundle_config') || error.code === 'PGRST204') {
      console.log('La columna bundle_config aún no existe en Supabase.');
      console.log('Se recomienda ejecutar el script SQL: supabase/migrations/20260907000000_add_bundle_config_to_products.sql');
    }
  } else {
    console.log('✓ Columna bundle_config está presente y funcional en la tabla products.');
  }
}

checkBundleColumn();
