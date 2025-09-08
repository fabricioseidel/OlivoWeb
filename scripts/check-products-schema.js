// Script to check the schema of the products table
require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

async function checkProductsSchema() {
  console.log('Checking products table schema...');
  
  try {
    // Try to get a sample record to see what columns exist
    const { data: sampleData, error: sampleError } = await supabaseAdmin
      .from('products')
      .select('*')
      .limit(1);

    if (sampleError) {
      console.error('Error fetching sample data:', sampleError);
      return;
    }

    if (sampleData && sampleData.length > 0) {
      console.log('Sample record columns:');
      Object.keys(sampleData[0]).forEach(column => {
        const value = sampleData[0][column];
        const type = typeof value;
        const displayValue = value === null ? 'null' : (type === 'string' && value.length > 50 ? value.substring(0, 50) + '...' : value);
        console.log(`  - ${column}: ${type} (${displayValue})`);
      });
    } else {
      console.log('No products found in the table');
      
      // Try to insert a minimal test record to see what columns are required
      console.log('\nTesting minimal insert...');
      const testRecord = {
        name: 'Test Product ' + Date.now(),
        barcode: 'TEST' + Date.now(),
      };

      const { data: insertData, error: insertError } = await supabaseAdmin
        .from('products')
        .insert([testRecord])
        .select('*');

      if (insertError) {
        console.log('Insert error (this tells us about required fields):', insertError);
      } else {
        console.log('Insert successful. Record structure:');
        console.log(insertData[0]);
        
        // Clean up the test record
        await supabaseAdmin
          .from('products')
          .delete()
          .eq('barcode', testRecord.barcode);
        console.log('Test record cleaned up');
      }
    }

    // Also check count
    const { count, error: countError } = await supabaseAdmin
      .from('products')
      .select('*', { count: 'exact', head: true });

    if (!countError) {
      console.log(`\nTotal products in table: ${count}`);
    }

  } catch (error) {
    console.error('Schema check failed:', error);
  }
}

checkProductsSchema().then(() => {
  console.log('Products schema check completed');
  process.exit(0);
});
