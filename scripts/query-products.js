// Script to query all products and UberEats products
require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

async function queryProducts() {
  console.log('📊 Consultando productos en Supabase...\n');
  
  try {
    // Consulta 1: Todos los productos
    console.log('='.repeat(60));
    console.log('1️⃣  TODOS LOS PRODUCTOS');
    console.log('='.repeat(60));
    
    const { data: allProducts, error: allError, count: allCount } = await supabaseAdmin
      .from('products')
      .select('*', { count: 'exact' });

    if (allError) {
      console.error('❌ Error en consulta de todos los productos:', allError);
      return;
    }

    console.log(`✅ Total de productos: ${allCount || allProducts.length}`);
    console.log(`📦 Primeros 5 productos:`);
    
    if (allProducts && allProducts.length > 0) {
      allProducts.slice(0, 5).forEach((product, index) => {
        console.log(`\n  ${index + 1}. ${product.name}`);
        console.log(`     ID: ${product.id}`);
        console.log(`     Categoría: ${product.category || 'N/A'}`);
        console.log(`     Precio: $${product.sale_price || 'N/A'}`);
        console.log(`     Stock: ${product.stock || 0}`);
      });
    }

    // Consulta 2: Productos para UberEats
    console.log('\n' + '='.repeat(60));
    console.log('2️⃣  PRODUCTOS PARA UBER EATS');
    console.log('='.repeat(60));
    
    // Buscar columnas relacionadas a UberEats
    const { data: uberEatsProducts, error: uberError, count: uberCount } = await supabaseAdmin
      .from('products')
      .select('*', { count: 'exact' })
      .eq('for_ubereats', true);

    if (uberError && uberError.code !== 'PGRST116') {
      console.error('⚠️  Error en consulta UberEats:', uberError.message);
      console.log('\n   Intentando búsqueda alternativa...');
    }

    if (uberEatsProducts && uberEatsProducts.length > 0) {
      console.log(`✅ Total de productos para UberEats: ${uberCount || uberEatsProducts.length}`);
      console.log(`📦 Primeros 5 productos UberEats:`);
      
      uberEatsProducts.slice(0, 5).forEach((product, index) => {
        console.log(`\n  ${index + 1}. ${product.name}`);
        console.log(`     ID: ${product.id}`);
        console.log(`     Categoría: ${product.category || 'N/A'}`);
        console.log(`     Precio: $${product.sale_price || 'N/A'}`);
      });
    } else {
      console.log('⚠️  No se encontró columna "for_ubereats" o está vacía');
      console.log('\n   Verificando estructura de la tabla...');
      
      // Obtener estructura
      const { data: sample } = await supabaseAdmin
        .from('products')
        .select('*')
        .limit(1);
      
      if (sample && sample.length > 0) {
        console.log('\n   Columnas disponibles:');
        Object.keys(sample[0]).forEach(col => {
          console.log(`   - ${col}`);
        });
      }
    }

    // Resumen estadístico
    console.log('\n' + '='.repeat(60));
    console.log('📈 RESUMEN');
    console.log('='.repeat(60));
    console.log(`Total productos: ${allCount || allProducts.length}`);
    console.log(`Productos UberEats: ${uberCount || uberEatsProducts.length || 'N/A'}`);

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

queryProducts();
