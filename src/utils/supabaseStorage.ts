import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { logger } from './logger';

export async function ensureUploadsBucket() {
  try {
    // Try to list buckets first
    const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();

    if (listError) {
      logger.error('Error listing buckets:', listError);
      return false;
    }

    // Check if uploads bucket exists
    const uploadsBucket = buckets?.find(bucket => bucket.name === 'uploads');

    if (!uploadsBucket) {
      logger.log('Creating uploads bucket...');

      // Create the uploads bucket
      const { error: createError } = await supabaseAdmin.storage.createBucket('uploads', {
        public: true,
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'image/svg+xml'],
        fileSizeLimit: 10485760 // 10MB
      });

      if (createError) {
        logger.error('Error creating uploads bucket:', createError);
        return false;
      }

      logger.log('Uploads bucket created successfully');
    }

    return true;
  } catch (error) {
    logger.error('Error ensuring uploads bucket:', error);
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
    // Load sharp dynamically to avoid bundling on client and satisfy ESLint
    let sharpInstance: any = null;
    try {
      const mod: any = await import('sharp');
      sharpInstance = mod?.default || mod;
    } catch { }
    if (sharpInstance && ['png', 'jpg', 'jpeg', 'webp'].includes(ext)) {
      try {
        const maxWidth = options?.maxWidth ?? 1200;
        const quality = options?.quality ?? 80;
        const pipeline = sharpInstance(buffer).rotate();
        const meta = await pipeline.metadata();
        if ((meta.width || 0) > maxWidth) pipeline.resize({ width: maxWidth });
        if (ext === 'png') buffer = await pipeline.png({ quality }).toBuffer();
        else if (ext === 'webp') buffer = await pipeline.webp({ quality }).toBuffer();
        else buffer = await pipeline.jpeg({ quality }).toBuffer();
      } catch (err) {
        logger.warn('sharp processing failed, uploading original buffer:', (err as any)?.message || err);
      }
    }
    const filename = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    logger.log(`Uploading ${filename} to Supabase Storage...`);

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('uploads')
      .upload(filename, buffer, {
        contentType: mimeType,
        upsert: true
      });

    if (uploadError) {
      logger.error('Upload error:', uploadError);
      throw uploadError;
    }

    logger.log('Upload successful:', uploadData);

    // Get public URL
    const { data: publicUrlData } = supabaseAdmin.storage
      .from('uploads')
      .getPublicUrl(filename);

    if (!publicUrlData?.publicUrl) {
      throw new Error('Could not get public URL');
    }

    logger.log('Public URL generated:', publicUrlData.publicUrl);

    return {
      success: true,
      url: publicUrlData.publicUrl,
      path: filename,
    };

  } catch (error: any) {
    logger.error('Error uploading image to Supabase:', error);
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
    logger.warn('deleteFromUploadsByPublicUrl failed:', (e as any)?.message || e);
  }
}
