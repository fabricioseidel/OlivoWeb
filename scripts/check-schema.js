// Script to check the schema of the categories table
require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

async function checkCategoriesSchema() {
  console.log('Checking categories table schema...');
  
  try {
    // Try to get a sample record to see what columns exist
    const { data: sampleData, error: sampleError } = await supabaseAdmin
      .from('categories')
      .select('*')
      .limit(1);

    if (sampleError) {
      console.error('Error fetching sample data:', sampleError);
      return;
    }

    if (sampleData && sampleData.length > 0) {
      console.log('Sample record columns:');
      Object.keys(sampleData[0]).forEach(column => {
        console.log(`  - ${column}: ${typeof sampleData[0][column]} (${sampleData[0][column]})`);
      });
    }

    // Try to describe the table structure using a query
    try {
      const { data: tableInfo, error: tableError } = await supabaseAdmin
        .rpc('get_table_columns', { table_name: 'categories' });
        
      if (!tableError && tableInfo) {
        console.log('\nTable structure from RPC:');
        console.log(tableInfo);
      }
    } catch (e) {
      console.log('RPC not available, using sample data approach');
    }

    // Let's also try a simple insert test to see what columns are required
    console.log('\nTesting minimal insert...');
    const testRecord = {
      name: 'Test Category ' + Date.now(),
    };

    const { data: insertData, error: insertError } = await supabaseAdmin
      .from('categories')
      .insert([testRecord])
      .select('*');

    if (insertError) {
      console.log('Insert error (this tells us about required fields):', insertError);
    } else {
      console.log('Insert successful. Record structure:');
      console.log(insertData[0]);
      
      // Clean up the test record
      await supabaseAdmin
        .from('categories')
        .delete()
        .eq('id', insertData[0].id);
      console.log('Test record cleaned up');
    }

  } catch (error) {
    console.error('Schema check failed:', error);
  }
}

checkCategoriesSchema().then(() => {
  console.log('Schema check completed');
  process.exit(0);
});
