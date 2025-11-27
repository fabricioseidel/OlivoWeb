/**
 * Test script to verify product image upload functionality
 */

async function testProductImageFunctionality() {
  console.log('🧪 Testing product image upload functionality...\n');

  try {
    const serverUrl = 'http://localhost:3001';
    
    // Test 1: Upload an image first
    console.log('1. Testing image upload...');
    const testImageData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    
    const uploadResponse = await fetch(`${serverUrl}/api/admin/upload-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: testImageData }),
    });

    if (!uploadResponse.ok) {
      console.error('❌ Image upload failed:', uploadResponse.status);
      return false;
    }

    const uploadResult = await uploadResponse.json();
    const uploadedImageUrl = uploadResult.url;
    console.log('✅ Image uploaded successfully:', uploadedImageUrl);

    // Test 2: Associate image with a test product
    console.log('\n2. Testing product image association...');
    const testProductId = 'test-product-' + Date.now();
    
    const imageAssocResponse = await fetch(`${serverUrl}/api/products/${testProductId}/image`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_url: uploadedImageUrl,
        gallery: [uploadedImageUrl],
      }),
    });

    if (!imageAssocResponse.ok) {
      console.error('❌ Image association failed:', imageAssocResponse.status);
      return false;
    }

    const assocResult = await imageAssocResponse.json();
    console.log('✅ Image associated with product successfully:', assocResult);

    // Test 3: Retrieve the image association
    console.log('\n3. Testing image retrieval...');
    const getImageResponse = await fetch(`${serverUrl}/api/products/${testProductId}/image`);

    if (!getImageResponse.ok) {
      console.error('❌ Image retrieval failed:', getImageResponse.status);
      return false;
    }

    const retrievedImage = await getImageResponse.json();
    console.log('✅ Image retrieved successfully:', retrievedImage);

    // Verify the data matches
    if (retrievedImage.image_url !== uploadedImageUrl) {
      console.error('❌ Retrieved image URL does not match uploaded URL');
      return false;
    }

    // Test 4: Clean up - remove the test association
    console.log('\n4. Testing image removal...');
    const deleteResponse = await fetch(`${serverUrl}/api/products/${testProductId}/image`, {
      method: 'DELETE',
    });

    if (!deleteResponse.ok) {
      console.error('❌ Image removal failed:', deleteResponse.status);
      return false;
    }

    console.log('✅ Image association removed successfully');

    // Test 5: Verify removal
    const checkRemovedResponse = await fetch(`${serverUrl}/api/products/${testProductId}/image`);
    const removedResult = await checkRemovedResponse.json();
    
    if (removedResult.image_url !== null) {
      console.error('❌ Image was not properly removed');
      return false;
    }

    console.log('✅ Removal verified successfully');

    console.log('\n🎉 All tests passed! Product image functionality is working correctly.');
    console.log('\n📋 What this means:');
    console.log('  - ✅ Images can be uploaded to Supabase Storage');
    console.log('  - ✅ Product-image associations are stored in local JSON file');
    console.log('  - ✅ Images can be retrieved for products');
    console.log('  - ✅ Image associations can be updated and removed');
    console.log('\n💡 Now when you update a product image in the admin panel:');
    console.log('  1. The image will be uploaded to Supabase Storage');
    console.log('  2. The product will be updated in the database (without image column)');
    console.log('  3. The image URL will be stored separately in data/product-images.json');
    console.log('  4. The ProductContext will load and display the correct image');

    return true;

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    return false;
  }
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch('http://localhost:3001/api/products');
    return response.ok;
  } catch {
    return false;
  }
}

async function main() {
  const serverRunning = await checkServer();
  
  if (!serverRunning) {
    console.log('⚠️  Server is not running on http://localhost:3001');
    console.log('💡 Please start the development server first:');
    console.log('   npm run dev');
    console.log('\nThen run this test again.');
    process.exit(1);
  }

  const success = await testProductImageFunctionality();
  
  if (!success) {
    process.exit(1);
  }
}

main().catch(console.error);
