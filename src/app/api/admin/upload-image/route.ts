import { NextResponse } from "next/server";
import fs from 'fs';
import path from 'path';
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
    if (typeof img === 'string' && img.startsWith('data:image')) {
      const match = img.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
      if (match) {
        const mime = match[1];
        const base64 = match[2];
        const extMap: Record<string, string> = {
          'image/png': 'png',
          'image/jpeg': 'jpg',
          'image/jpg': 'jpg',
          'image/webp': 'webp',
          'image/gif': 'gif',
          'image/svg+xml': 'svg'
        };
        const ext = extMap[mime] || mime.split('/')[1] || 'png';
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
        await fs.promises.mkdir(uploadsDir, { recursive: true });
        const filename = `upload-${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
        const filePath = path.join(uploadsDir, filename);
        const buffer = Buffer.from(base64, 'base64');
        await fs.promises.writeFile(filePath, buffer);
        return NextResponse.json({ url: `/uploads/${filename}` }, { status: 201 });
      }
    }
    return NextResponse.json({ error: 'Invalid image' }, { status: 400 });
  } catch (e: any) {
    console.error('upload-image error', e?.message || e);
    return NextResponse.json({ error: 'Error saving image' }, { status: 500 });
  }
}
