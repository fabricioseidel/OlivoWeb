import { NextResponse } from "next/server";
import { uploadImageToSupabase } from "@/utils/supabaseStorage";

export async function POST(req: Request) {
  try {
    const { image } = await req.json();
    
    if (!image || !image.startsWith('data:image')) {
      return NextResponse.json({ 
        error: 'Invalid image data. Please provide a base64 data URL.' 
      }, { status: 400 });
    }

    const match = image.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (!match) {
      return NextResponse.json({ 
        error: 'Invalid image format' 
      }, { status: 400 });
    }

    const mimeType = match[1];
    console.log('Testing image upload with mime type:', mimeType);

    const result = await uploadImageToSupabase(image, mimeType, 'test');

    if (result.success) {
      return NextResponse.json({
        success: true,
        url: result.url,
        message: 'Image uploaded successfully to Supabase Storage'
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error,
        message: 'Failed to upload image to Supabase Storage'
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Image upload test error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      message: 'Unexpected error during image upload test'
    }, { status: 500 });
  }
}
