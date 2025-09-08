const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function addImageUrlColumnToProducts() {
  console.log('🔄 Adding image_url column to products table...\n');

  try {
    // First, check if the column already exists
    console.log('1. Checking current products table schema...');
    const { data: existingColumns, error: schemaError } = await supabaseAdmin
      .from('products')
      .select('*')
      .limit(1);

    if (schemaError) {
      console.error('❌ Failed to check schema:', schemaError.message);
      return false;
    }

    if (existingColumns && existingColumns.length > 0) {
      const firstRow = existingColumns[0];
      if ('image_url' in firstRow) {
        console.log('✅ image_url column already exists in products table');
        return true;
      }
    }

    console.log('📝 Current columns:', existingColumns?.[0] ? Object.keys(existingColumns[0]).join(', ') : 'No data');

    // Add the column using SQL
    console.log('\n2. Adding image_url column...');
    const { error: alterError } = await supabaseAdmin.rpc('exec_sql', {
      sql: 'ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;'
    });

    if (alterError) {
      // Try alternative approach using direct SQL
      console.log('📝 Trying alternative approach...');
      
      // Create a temporary product to test if column was added
      const testData = {
        barcode: 'test-' + Date.now(),
        name: 'Test Product',
        category: 'test',
        purchase_price: 0,
        sale_price: 10,
        stock: 1,
        image_url: 'https://example.com/test.jpg'
      };

      const { error: insertError } = await supabaseAdmin
        .from('products')
        .insert([testData]);

      if (insertError) {
        if (insertError.message.includes('image_url')) {
          console.log('⚠️  Column image_url does not exist yet. Creating migration script...');
          
          // Create a migration script file
          const migrationContent = `-- Migration: Add image_url column to products table
-- Created: ${new Date().toISOString()}

ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add comment
COMMENT ON COLUMN products.image_url IS 'URL to product image stored in Supabase Storage';
`;

          console.log('\n📄 Migration SQL needed:');
          console.log(migrationContent);
          
          console.log('\n📋 Manual steps required:');
          console.log('1. Go to your Supabase dashboard');
          console.log('2. Navigate to SQL Editor');
          console.log('3. Run the following SQL:');
          console.log('   ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;');
          console.log('4. Verify the column was added by checking the table schema');
          
          return false;
        } else {
          console.error('❌ Unexpected error:', insertError.message);
          return false;
        }
      } else {
        // Delete the test record
        await supabaseAdmin
          .from('products')
          .delete()
          .eq('barcode', testData.barcode);
        
        console.log('✅ image_url column added successfully!');
        return true;
      }
    }

    console.log('✅ image_url column added successfully!');
    return true;

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    return false;
  }
}

// Test the column after adding it
async function testImageUrlColumn() {
  console.log('\n🧪 Testing image_url column functionality...');
  
  try {
    const testData = {
      barcode: 'test-image-' + Date.now(),
      name: 'Test Product with Image',
      category: 'test',
      purchase_price: 0,
      sale_price: 15,
      stock: 1,
      image_url: 'https://example.com/test-image.jpg'
    };

    // Insert test product with image_url
    const { data: insertData, error: insertError } = await supabaseAdmin
      .from('products')
      .insert([testData])
      .select()
      .single();

    if (insertError) {
      console.error('❌ Failed to insert test product:', insertError.message);
      return false;
    }

    console.log('✅ Successfully inserted product with image_url:', insertData.image_url);

    // Update the image_url
    const newImageUrl = 'https://example.com/updated-image.jpg';
    const { data: updateData, error: updateError } = await supabaseAdmin
      .from('products')
      .update({ image_url: newImageUrl })
      .eq('barcode', testData.barcode)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Failed to update image_url:', updateError.message);
      return false;
    }

    console.log('✅ Successfully updated image_url:', updateData.image_url);

    // Clean up test data
    await supabaseAdmin
      .from('products')
      .delete()
      .eq('barcode', testData.barcode);

    console.log('✅ Test completed successfully - image_url column is working!');
    return true;

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
}

async function main() {
  const columnAdded = await addImageUrlColumnToProducts();
  
  if (columnAdded) {
    await testImageUrlColumn();
    console.log('\n🎉 Products table is now ready for image storage!');
    console.log('\n📋 Next steps:');
    console.log('1. Update ProductContext to save image_url when updating products');
    console.log('2. Test image upload/update functionality in the admin panel');
  } else {
    console.log('\n⚠️  Manual intervention required - see instructions above');
  }
}

main().catch(console.error);
