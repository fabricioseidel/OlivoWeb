import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Initialize Supabase Storage - creates uploads bucket if it doesn't exist
export async function POST() {
  try {
    console.log("Checking if uploads bucket exists...");
    
    // List buckets to see if uploads exists
    const { data: buckets, error: bucketsError } = await supabaseAdmin.storage.listBuckets();
    
    if (bucketsError) {
      console.error("Error listing buckets:", bucketsError);
      return NextResponse.json({ 
        error: "Error listing buckets", 
        details: bucketsError.message 
      }, { status: 500 });
    }

    console.log("Existing buckets:", buckets?.map(b => b.name));

    // Check if uploads bucket exists
    const uploadsBucket = buckets?.find(bucket => bucket.name === 'uploads');
    
    if (!uploadsBucket) {
      console.log("Creating uploads bucket...");
      
      // Create the uploads bucket
      const { data: newBucket, error: createError } = await supabaseAdmin.storage.createBucket('uploads', {
        public: true,
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'],
        fileSizeLimit: 5242880 // 5MB
      });

      if (createError) {
        console.error("Error creating uploads bucket:", createError);
        return NextResponse.json({ 
          error: "Error creating uploads bucket", 
          details: createError.message 
        }, { status: 500 });
      }

      console.log("Uploads bucket created successfully:", newBucket);
    } else {
      console.log("Uploads bucket already exists");
    }

    // Test upload
    const testContent = Buffer.from('test file content');
    const testFilename = `test-${Date.now()}.txt`;
    
    console.log(`Testing upload of ${testFilename}...`);
    
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('uploads')
      .upload(testFilename, testContent, { 
        contentType: 'text/plain',
        upsert: true 
      });

    if (uploadError) {
      console.error("Error uploading test file:", uploadError);
      return NextResponse.json({ 
        error: "Error uploading test file", 
        details: uploadError.message 
      }, { status: 500 });
    }

    console.log("Test upload successful:", uploadData);

    // Get public URL for test file
    const { data: publicUrlData } = supabaseAdmin.storage
      .from('uploads')
      .getPublicUrl(testFilename);

    console.log("Test file public URL:", publicUrlData.publicUrl);

    // Clean up test file
    const { error: deleteError } = await supabaseAdmin.storage
      .from('uploads')
      .remove([testFilename]);

    if (deleteError) {
      console.warn("Could not delete test file:", deleteError);
    } else {
      console.log("Test file cleaned up successfully");
    }

    return NextResponse.json({
      success: true,
      message: "Storage initialized successfully",
      bucket: uploadsBucket ? "existed" : "created",
      testUpload: {
        filename: testFilename,
        publicUrl: publicUrlData.publicUrl,
        uploaded: true,
        cleaned: !deleteError
      }
    });

  } catch (error: any) {
    console.error("Storage initialization error:", error);
    return NextResponse.json({ 
      error: "Unexpected error", 
      details: error.message 
    }, { status: 500 });
  }
}
