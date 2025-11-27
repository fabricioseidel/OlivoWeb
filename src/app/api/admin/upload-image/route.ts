import { NextResponse } from "next/server";
import { uploadImageToSupabase, deleteFromUploadsByPublicUrl } from "@/utils/supabaseStorage";
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: Request) {
  // Only admins can upload images via this endpoint
  try {
    const session: any = await getServerSession(authOptions as any);
    if (!session || session?.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
  } catch (e) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
  const body = await req.json();
  const img = body?.image;
  const oldUrl = body?.oldUrl || body?.image_url_old || body?.previousUrl;
    if (typeof img === 'string' && img.startsWith('data:image')) {
      const match = img.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
      if (match) {
        const mime = match[1];
        const base64 = match[0]; // keep full data URL for util to parse

        const result = await uploadImageToSupabase(base64, mime, 'upload', { maxWidth: 1200, quality: 80 });
        if (result.success && result.url) {
          // Best-effort delete of previous image
          if (oldUrl) { deleteFromUploadsByPublicUrl(oldUrl).catch(() => {}); }
          return NextResponse.json({ url: result.url, path: result.path }, { status: 201 });
        }
        return NextResponse.json({ error: result.error || 'Upload failed' }, { status: 500 });
      }
    }
    return NextResponse.json({ error: 'Invalid image' }, { status: 400 });
  } catch (e: any) {
    console.error('upload-image error', e?.message || e);
    return NextResponse.json({ error: 'Error saving image' }, { status: 500 });
  }
}
