/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-require-imports */
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('❌ Faltan variables de entorno NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabaseAdmin = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

async function runMigration() {
  try {
    console.log('📊 Creando tabla settings...');
    
    // Leer el SQL del archivo
    const sqlPath = path.join(__dirname, 'supabase', '28_create_settings_table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Ejecutar el SQL usando rpc (si la función existe) o directamente
    // Como Supabase no permite ejecutar SQL directo con el cliente, usaremos fetch
    const response = await fetch(`${url}/rest/v1/rpc/sql`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    });

    if (!response.ok) {
      // Alternativa: usar el cliente para hacer operaciones específicas
      console.log('⚠️  Usando operaciones de cliente para crear tabla...');
      
      // Crear tabla con el cliente
      const { error } = await supabaseAdmin
        .rpc('exec_sql', { sql });

      if (error) {
        console.warn('⚠️  No se puede ejecutar SQL directo. Usa el dashboard de Supabase para ejecutar:');
        console.log(sql);
        return;
      }
    }

    console.log('✅ Tabla settings creada exitosamente');
    
    // Verificar que la tabla existe
    const { data, error } = await supabaseAdmin
      .from('settings')
      .select('*')
      .eq('id', true)
      .single();

    if (error) {
      console.log('⚠️  Tabla aún no disponible. Por favor ejecuta el script SQL en el dashboard de Supabase.');
    } else {
      console.log('✅ Configuración por defecto creada:', data);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n📋 Por favor, ejecuta este SQL en tu dashboard de Supabase:');
    const sqlPath = path.join(__dirname, 'supabase', '28_create_settings_table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log(sql);
  }
}

runMigration();
