import { supabaseAdmin } from '@/lib/supabaseAdmin';
// Optional: dynamic import of sharp only on server to avoid bundling in client
let sharp: any = null;
try { sharp = require('sharp'); } catch {}

export async function ensureUploadsBucket() {
  try {
    // Try to list buckets first
    const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
    
    if (listError) {
      console.error('Error listing buckets:', listError);
      return false;
    }

    // Check if uploads bucket exists
    const uploadsBucket = buckets?.find(bucket => bucket.name === 'uploads');
    
    if (!uploadsBucket) {
      console.log('Creating uploads bucket...');
      
      // Create the uploads bucket
      const { error: createError } = await supabaseAdmin.storage.createBucket('uploads', {
        public: true,
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'image/svg+xml'],
        fileSizeLimit: 10485760 // 10MB
      });

      if (createError) {
        console.error('Error creating uploads bucket:', createError);
        return false;
      }
      
      console.log('Uploads bucket created successfully');
    }
    
    return true;
  } catch (error) {
    console.error('Error ensuring uploads bucket:', error);
    return false;
  }
}

export async function uploadImageToSupabase(
  base64Data: string,
  mimeType: string,
  prefix: string = 'upload',
  options?: { maxWidth?: number; quality?: number }
): Promise<{ success: boolean; url?: string; error?: string; path?: string }> {
  try {
    // Ensure bucket exists
    const bucketReady = await ensureUploadsBucket();
    if (!bucketReady) {
      throw new Error('Could not ensure uploads bucket exists');
    }

    // Process the image
    const base64 = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');
  let buffer = Buffer.from(base64, 'base64');
    
    const extMap: Record<string, string> = {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/webp': 'webp',
      'image/gif': 'gif',
      'image/svg+xml': 'svg'
    };
    
    const ext = extMap[mimeType] || mimeType.split('/')[1] || 'png';

    // Resize/compress if sharp is available and it's a raster image
    if (sharp && ['png','jpg','jpeg','webp'].includes(ext)) {
      try {
        const maxWidth = options?.maxWidth ?? 1200;
        const quality = options?.quality ?? 80;
        const pipeline = sharp(buffer).rotate();
        const meta = await pipeline.metadata();
        if ((meta.width || 0) > maxWidth) pipeline.resize({ width: maxWidth });
        if (ext === 'png') buffer = await pipeline.png({ quality }).toBuffer();
        else if (ext === 'webp') buffer = await pipeline.webp({ quality }).toBuffer();
        else buffer = await pipeline.jpeg({ quality }).toBuffer();
      } catch (err) {
        console.warn('sharp processing failed, uploading original buffer:', (err as any)?.message || err);
      }
    }
    const filename = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
    
    console.log(`Uploading ${filename} to Supabase Storage...`);
    
    // Upload to Supabase Storage
  const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('uploads')
      .upload(filename, buffer, { 
        contentType: mimeType, 
        upsert: true 
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    console.log('Upload successful:', uploadData);

    // Get public URL
    const { data: publicUrlData } = supabaseAdmin.storage
      .from('uploads')
      .getPublicUrl(filename);

    if (!publicUrlData?.publicUrl) {
      throw new Error('Could not get public URL');
    }

    console.log('Public URL generated:', publicUrlData.publicUrl);

    return {
      success: true,
      url: publicUrlData.publicUrl,
      path: filename,
    };

  } catch (error: any) {
    console.error('Error uploading image to Supabase:', error);
    return {
      success: false,
      error: error.message || 'Unknown error'
    };
  }
}

export async function deleteFromUploadsByPublicUrl(publicUrl: string) {
  try {
    if (!publicUrl) return;
    const parts = publicUrl.split('/');
    const idx = parts.findIndex(p => p === 'object');
    const path = idx >= 0 ? decodeURIComponent(parts.slice(idx + 1).join('/')) : parts[parts.length - 1];
    if (!path) return;
    await supabaseAdmin.storage.from('uploads').remove([path]);
  } catch (e) {
    console.warn('deleteFromUploadsByPublicUrl failed:', (e as any)?.message || e);
  }
}
