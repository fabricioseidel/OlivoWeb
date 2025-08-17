import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import fs from "fs";
import path from "path";

const SETTINGS_PATH = path.join(process.cwd(), "data", "store-settings.json");

export async function GET() {
  try {
    const content = await fs.promises.readFile(SETTINGS_PATH, "utf-8");
    return NextResponse.json(JSON.parse(content));
  } catch (e: any) {
    return NextResponse.json({ message: 'Error leyendo settings', detail: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session: any = await getServerSession(authOptions as any);
  if (!session || session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }
  try {
    const data = await req.json();
    // If bannerUrl is a data URL (base64), decode and save it to public/uploads
    try {
      const banner = data?.appearance?.bannerUrl;
      if (typeof banner === 'string' && banner.startsWith('data:image')) {
        const match = banner.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
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
          const filename = `banner-${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
          const filePath = path.join(uploadsDir, filename);
          const buffer = Buffer.from(base64, 'base64');
          await fs.promises.writeFile(filePath, buffer);
          // replace value with the public path
          data.appearance.bannerUrl = `/uploads/${filename}`;
        }
      }
    } catch (e:any) {
      // Non-fatal: if saving the uploaded image fails, continue and let the main write attempt happen
      console.error('Error saving banner image:', e?.message || e);
    }
    await fs.promises.writeFile(SETTINGS_PATH, JSON.stringify(data, null, 2), "utf-8");
    return NextResponse.json({ message: 'Settings guardados' });
  } catch (e: any) {
    return NextResponse.json({ message: 'Error guardando settings', detail: e.message }, { status: 500 });
  }
}
