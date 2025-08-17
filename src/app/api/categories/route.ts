// ...existing code...
export * from './route';

import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import fs from 'fs';
import path from 'path';
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";

// GET /api/categories
export async function GET() {
  try {
    // Obtener todos los productos y categorías
    const categories = await prisma.category.findMany({
      orderBy: { createdAt: "desc" },
    });
    // Obtener la relación producto-categoría
    const productCategories = await prisma.productCategory.findMany({
      include: { category: true }
    });
    // Calcular el conteo de productos por categoría
    const categoryCounts: Record<string, number> = {};
    categories.forEach(cat => { categoryCounts[cat.name] = 0; });
    productCategories.forEach(pc => {
      if (pc.category && categoryCounts[pc.category.name] !== undefined) {
        categoryCounts[pc.category.name]++;
      }
    });
    return NextResponse.json(categories.map(c => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      image: c.image,
      isActive: c.isActive,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      productsCount: categoryCounts[c.name] || 0,
    })));
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error fetching categories" }, { status: 500 });
  }
}

// POST /api/categories
export async function POST(req: Request) {
  // Only admins can create categories
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
    // If image is a data URL, decode and save to public/uploads
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
    const normalizeSlug = (value: string) => value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  const { name, slug, description, isActive, image } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: "Name and slug are required" }, { status: 400 });
    }

    const finalSlug = normalizeSlug(slug);
    const exists = await prisma.category.findFirst({ where: { OR: [{ name }, { slug: finalSlug }] } });
    if (exists) {
      return NextResponse.json({ error: "Category with same name or slug already exists" }, { status: 409 });
    }

    const category = await prisma.category.create({
      data: {
        name: String(name).trim(),
        slug: finalSlug,
        description: description ? String(description) : null,
        image: image ? String(image) : null,
        isActive: isActive ?? true,
      }
    });

    return NextResponse.json({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      image: category.image,
      isActive: category.isActive,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
      productsCount: 0,
    }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error creating category" }, { status: 500 });
  }
}
