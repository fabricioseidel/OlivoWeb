import { NextResponse } from "next/server";
import fs from 'fs';
import path from 'path';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = 'force-dynamic';

// GET /api/categories/[id]
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const name: string = data.name ?? data.label ?? "";
    // Contar productos relacionados por coincidencia de categoría (texto)
    const { count, error: countErr } = await supabase
      .from("products")
      .select("barcode", { count: 'exact', head: true })
      .ilike("category", `%${name}%`);
    if (countErr) throw countErr;

    return NextResponse.json({
      id: String(data.id ?? name),
      name,
      slug:
        data.slug ?? (name ? String(name).toLowerCase().replace(/[^a-z0-9]+/gi, "-") : undefined),
      description: data.description ?? data.desc ?? null,
      image: data.image ?? data.image_url ?? null,
      isActive:
        typeof data.is_active === "boolean"
          ? data.is_active
          : typeof data.isActive === "boolean"
          ? data.isActive
          : true,
      createdAt: data.created_at ?? data.createdAt ?? null,
      updatedAt: data.updated_at ?? data.updatedAt ?? null,
      productsCount: count ?? 0,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error fetching category" }, { status: 500 });
  }
}

// PATCH /api/categories/[id]
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  // Only admins can update categories
  try {
    const session: any = await getServerSession(authOptions as any);
    const role = (session as any)?.role || (session?.user as any)?.role || '';
    if (!session || !String(role).toUpperCase().includes('ADMIN')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
  } catch (e) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  try {
    const { id } = await params;
    const body = await req.json();
    // process body.image if data URL -> save under /public/uploads and set path
    try {
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
          const filename = `category-${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
          const filePath = path.join(uploadsDir, filename);
          const buffer = Buffer.from(base64, 'base64');
          await fs.promises.writeFile(filePath, buffer);
          body.image = `/uploads/${filename}`;
        }
      }
    } catch (e:any) {
      console.error('Error saving category image', e?.message || e);
    }
    const { name, slug, description, isActive, image } = body;
    const normalizeSlug = (value: string) => value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    const payload: any = {
      ...(name !== undefined ? { name: String(name).trim() } : {}),
      ...(slug !== undefined ? { slug: normalizeSlug(String(slug)) } : {}),
      ...(description !== undefined ? { description: description ? String(description) : null } : {}),
      ...(isActive !== undefined ? { is_active: Boolean(isActive) } : {}),
      ...(image !== undefined ? { image: image || null } : {}),
      updated_at: new Date().toISOString(),
    };

  const { data: updated, error } = await supabaseAdmin
      .from('categories')
      .update(payload)
      .eq('id', id)
      .select('*')
      .maybeSingle();
    if (error) throw error;

    const catName = updated?.name ?? '';
    const { count } = await supabase
      .from('products')
      .select('barcode', { count: 'exact', head: true })
      .ilike('category', `%${catName}%`);

    return NextResponse.json({
      id: String(updated?.id ?? id),
      name: updated?.name,
      slug: updated?.slug,
      description: updated?.description ?? null,
      image: updated?.image ?? updated?.image_url ?? null,
      isActive:
        typeof updated?.is_active === 'boolean' ? updated?.is_active : true,
      createdAt: updated?.created_at ?? null,
      updatedAt: updated?.updated_at ?? null,
      productsCount: count ?? 0,
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: "Error updating category" }, { status: 500 });
  }
}

// DELETE /api/categories/[id]
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  // Only admins can delete categories
  try {
    const session: any = await getServerSession(authOptions as any);
    const role = (session as any)?.role || (session?.user as any)?.role || '';
    if (!session || !String(role).toUpperCase().includes('ADMIN')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
  } catch (e) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const { data: category, error } = await supabase
      .from('categories')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!category) {
      return NextResponse.json({ error: "Categoría no encontrada" }, { status: 404 });
    }
    // Contar referencias en products.category
    const name = category.name ?? '';
    const { count } = await supabase
      .from('products')
      .select('barcode', { count: 'exact', head: true })
      .ilike('category', `%${name}%`);
    if ((count ?? 0) > 0) {
      return NextResponse.json({ error: "No se puede eliminar una categoría con productos asociados" }, { status: 400 });
    }
  const { error: delErr } = await supabaseAdmin.from('categories').delete().eq('id', id);
    if (delErr) throw delErr;
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error deleting category" }, { status: 500 });
  }
}
