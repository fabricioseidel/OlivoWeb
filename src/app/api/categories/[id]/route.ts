import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from 'fs';
import path from 'path';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = 'force-dynamic';

// GET /api/categories/[id]
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) return NextResponse.json({ error: "Not found" }, { status: 404 });
    // Contar asociaciones en ProductCategory
    const productsCount = await prisma.productCategory.count({ where: { categoryId: id } });
    return NextResponse.json({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      image: category.image,
      isActive: category.isActive,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
      productsCount,
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
    if (!session || session?.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
  } catch (e) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  try {
    const { id } = await params;
    const body = await req.json();
    // process body.image if data URL
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

    const updated = await prisma.category.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name: String(name).trim() } : {}),
        ...(slug !== undefined ? { slug: normalizeSlug(String(slug)) } : {}),
        ...(description !== undefined ? { description: description ? String(description) : null } : {}),
        ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
      },
    });
    // Contar asociaciones en ProductCategory
    const productsCount = await prisma.productCategory.count({ where: { categoryId: id } });
    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      description: updated.description,
      image: updated.image,
      isActive: updated.isActive,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      productsCount,
    });
  } catch (e: any) {
    if (e.code === 'P2002') {
      return NextResponse.json({ error: 'Slug or name already exists' }, { status: 409 });
    }
    console.error(e);
    return NextResponse.json({ error: "Error updating category" }, { status: 500 });
  }
}

// DELETE /api/categories/[id]
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  // Only admins can delete categories
  try {
    const session: any = await getServerSession(authOptions as any);
    if (!session || session?.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
  } catch (e) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { id } = await params;
    // Obtener el nombre de la categoría
    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) {
      return NextResponse.json({ error: "Categoría no encontrada" }, { status: 404 });
    }
    // Buscar asociaciones en la tabla ProductCategory
    const associationCount = await prisma.productCategory.count({ where: { categoryId: id } });
    if (associationCount > 0) {
      return NextResponse.json({ error: "No se puede eliminar una categoría con productos asociados" }, { status: 400 });
    }
    await prisma.category.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error deleting category" }, { status: 500 });
  }
}
