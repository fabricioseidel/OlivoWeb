// Load environment variables
require('dotenv').config({ path: '.env.local' });

// Import supabase admin client
const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

async function setupSupabaseStorage() {
  console.log('Setting up Supabase Storage...');
  console.log('URL:', url ? 'configured' : 'missing');
  console.log('Service Key:', serviceKey ? 'configured' : 'missing');
  
  if (!url || !serviceKey) {
    console.error('Missing environment variables!');
    return;
  }
  
  try {
    // List existing buckets
    console.log('Checking existing buckets...');
    const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
    
    if (listError) {
      console.error('Error listing buckets:', listError);
      return;
    }
    
    console.log('Existing buckets:', buckets?.map(b => b.name) || []);
    
    // Check if uploads bucket exists
    const uploadsBucket = buckets?.find(bucket => bucket.name === 'uploads');
    
    if (uploadsBucket) {
      console.log('✓ Uploads bucket already exists');
    } else {
      console.log('Creating uploads bucket...');
      
      const { data: newBucket, error: createError } = await supabaseAdmin.storage.createBucket('uploads', {
        public: true,
        allowedMimeTypes: [
          'image/png', 
          'image/jpeg', 
          'image/jpg', 
          'image/webp', 
          'image/gif', 
          'image/svg+xml'
        ],
        fileSizeLimit: 10485760 // 10MB
      });
      
      if (createError) {
        console.error('Error creating bucket:', createError);
        return;
      }
      
      console.log('✓ Uploads bucket created successfully:', newBucket);
    }
    
    // Test upload
    console.log('Testing upload...');
    const testContent = Buffer.from('Hello Supabase Storage!');
    const testFilename = `test-${Date.now()}.txt`;
    
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('uploads')
      .upload(testFilename, testContent, {
        contentType: 'text/plain',
        upsert: true
      });
    
    if (uploadError) {
      console.error('Upload test failed:', uploadError);
      return;
    }
    
    console.log('✓ Upload test successful:', uploadData);
    
    // Get public URL
    const { data: publicUrl } = supabaseAdmin.storage
      .from('uploads')
      .getPublicUrl(testFilename);
    
    console.log('✓ Public URL:', publicUrl.publicUrl);
    
    // Clean up test file
    const { error: deleteError } = await supabaseAdmin.storage
      .from('uploads')
      .remove([testFilename]);
    
    if (deleteError) {
      console.warn('Could not delete test file:', deleteError);
    } else {
      console.log('✓ Test file cleaned up');
    }
    
    console.log('\n🎉 Supabase Storage setup completed successfully!');
    console.log('Your uploads bucket is ready to use.');
    
  } catch (error) {
    console.error('Setup failed:', error);
  }
}

setupSupabaseStorage().then(() => {
  console.log('Script completed');
  process.exit(0);
});
