import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Test endpoint to verify Supabase Storage configuration
export async function GET() {
  try {
    // List buckets
    const { data: buckets, error: bucketsError } = await supabaseAdmin.storage.listBuckets();
    
    if (bucketsError) {
      console.error("Error listing buckets:", bucketsError);
      return NextResponse.json({ 
        error: "Error listing buckets", 
        details: bucketsError.message 
      }, { status: 500 });
    }

    // Check if uploads bucket exists
    const uploadsBucket = buckets?.find(bucket => bucket.name === 'uploads');
    
    if (!uploadsBucket) {
      return NextResponse.json({ 
        error: "Uploads bucket not found", 
        buckets: buckets?.map(b => b.name) || [] 
      }, { status: 404 });
    }

    // Try to list files in uploads bucket
    const { data: files, error: filesError } = await supabaseAdmin.storage
      .from('uploads')
      .list('', { limit: 10 });

    if (filesError) {
      console.error("Error listing files:", filesError);
      return NextResponse.json({ 
        error: "Error listing files in uploads bucket", 
        details: filesError.message 
      }, { status: 500 });
    }

    // Test upload a simple file
    const testContent = Buffer.from('test file content');
    const testFilename = `test-${Date.now()}.txt`;
    
    const { error: uploadError } = await supabaseAdmin.storage
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

    // Get public URL for test file
    const { data: publicUrlData } = supabaseAdmin.storage
      .from('uploads')
      .getPublicUrl(testFilename);

    // Clean up test file
    await supabaseAdmin.storage
      .from('uploads')
      .remove([testFilename]);

    return NextResponse.json({
      success: true,
      bucket: uploadsBucket,
      filesCount: files?.length || 0,
      testUpload: {
        filename: testFilename,
        publicUrl: publicUrlData.publicUrl
      },
      files: files?.slice(0, 5).map(f => f.name) || []
    });

  } catch (error: any) {
    console.error("Storage test error:", error);
    return NextResponse.json({ 
      error: "Unexpected error", 
      details: error.message 
    }, { status: 500 });
  }
}
