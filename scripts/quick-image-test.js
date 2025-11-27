// Simple test script
async function quickTest() {
  try {
    console.log('🧪 Quick test of image functionality...');
    
    // Test upload
    const testImageData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    
    console.log('1. Testing image upload...');
    const uploadResponse = await fetch('http://localhost:3001/api/admin/upload-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: testImageData }),
    });

    if (uploadResponse.ok) {
      const result = await uploadResponse.json();
      console.log('✅ Upload successful:', result.url);

      // Test product image association
      console.log('2. Testing product image association...');
      const assocResponse = await fetch('http://localhost:3001/api/products/TEST123/image', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: result.url }),
      });

      if (assocResponse.ok) {
        const assocResult = await assocResponse.json();
        console.log('✅ Association successful:', assocResult);

        // Test retrieval
        console.log('3. Testing retrieval...');
        const getResponse = await fetch('http://localhost:3001/api/products/TEST123/image');
        
        if (getResponse.ok) {
          const getResult = await getResponse.json();
          console.log('✅ Retrieval successful:', getResult);
          console.log('\n🎉 All tests passed! Image functionality is working.');
        } else {
          console.log('❌ Retrieval failed');
        }
      } else {
        console.log('❌ Association failed');
      }
    } else {
      console.log('❌ Upload failed');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

quickTest();
