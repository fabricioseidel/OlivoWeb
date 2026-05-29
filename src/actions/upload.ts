"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { uploadImageToSupabase, deleteFromUploadsByPublicUrl } from "@/utils/supabaseStorage";
import { uploadImage as uploadImageToCloudinary } from "@/server/cloudinary.service";

export async function uploadImageToCloudinaryServerAction(imgBase64: string) {
  try {
    const session: any = await getServerSession(authOptions as any);
    if (!session || session?.user?.role !== 'ADMIN') {
      return { ok: false, error: 'No autorizado' };
    }
    if (typeof imgBase64 !== 'string' || !imgBase64.startsWith('data:image')) {
      return { ok: false, error: 'Invalid image format' };
    }
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      return { ok: false, error: 'Cloudinary no esta configurado (faltan CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET)' };
    }
    const result = await uploadImageToCloudinary(imgBase64);
    return { ok: true, url: result.url, publicId: result.publicId };
  } catch (e: any) {
    const msg = e?.message || (typeof e === 'string' ? e : 'Error desconocido');
    console.error('uploadImageToCloudinaryServerAction error', msg, e);
    return { ok: false, error: `Cloudinary: ${msg}` };
  }
}

export async function uploadImageServerAction(imgBase64: string, oldUrl?: string | null) {
  try {
    const session: any = await getServerSession(authOptions as any);
    if (!session || session?.user?.role !== 'ADMIN') {
      return { ok: false, error: 'No autorizado' };
    }

    if (typeof imgBase64 === 'string' && imgBase64.startsWith('data:image')) {
      const match = imgBase64.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
      if (match) {
        const mime = match[1];
        const base64 = match[0]; // keep full data URL for util to parse

        const result = await uploadImageToSupabase(base64, mime, 'product', { maxWidth: 1200, quality: 80 });
        
        if (result.success && result.url) {
          // Best-effort delete of previous image
          if (oldUrl) { 
            deleteFromUploadsByPublicUrl(oldUrl).catch(() => { }); 
          }
          return { ok: true, url: result.url };
        }
        return { ok: false, error: result.error || 'Upload failed' };
      }
    }
    return { ok: false, error: 'Invalid image format' };
  } catch (e: any) {
    console.error('uploadImageServerAction error', e?.message || e);
    return { ok: false, error: 'Error saving image' };
  }
}
