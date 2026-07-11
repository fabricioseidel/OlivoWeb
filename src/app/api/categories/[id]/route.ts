import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { supabaseServer } from "@/lib/supabase-server";
import { uploadImageToSupabase } from "@/utils/supabaseStorage";
import { categoryTokenMatches, replaceCategoryToken } from "@/lib/category-tokens";
import { slugify } from "@/utils/string-utils";

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
    // Contar productos relacionados por token exacto de categoría (no substring:
    // "Te" no debe matchear "Aceite" ni "Detergente").
    const { data: productsData, error: productsErr } = await supabase
      .from("products")
      .select("category");
    if (productsErr) throw productsErr;
    const count = (productsData || []).filter((p: any) => categoryTokenMatches(p.category, name)).length;

    return NextResponse.json({
      id: String(data.id ?? name),
      name,
      slug: data.slug ?? (name ? slugify(String(name)) : undefined),
      description: data.description ?? data.desc ?? null,
      image: data.image_url ?? null, // Use correct column name
      isActive: data.is_active ?? true, // Use correct column name
      createdAt: data.created_at ?? data.createdAt ?? null,
      updatedAt: data.updated_at ?? data.updatedAt ?? null,
      productsCount: count,
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (e) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  try {
    const { id } = await params;
    const body = await req.json();
    // process body.image if data URL -> upload to Supabase and set public URL
    try {
      const img = body?.image;
      if (typeof img === 'string' && img.startsWith('data:image')) {
        const match = img.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
        if (match) {
          const mime = match[1];
          console.log(`Processing image upload with mime type: ${mime}`);

          // Always use Supabase Storage. Local filesystem uploads are gitignored and
          // not reliable on Vercel (ephemeral filesystem), resulting in broken /uploads URLs.
          const uploadResult = await uploadImageToSupabase(img, mime, 'category');

          if (uploadResult.success && uploadResult.url) {
            body.image = uploadResult.url;
            console.log(`Image successfully uploaded to Supabase: ${uploadResult.url}`);
          } else {
            console.error(`Supabase upload failed: ${uploadResult.error}`);
            return NextResponse.json(
              { error: uploadResult.error || 'No se pudo subir la imagen a Supabase' },
              { status: 500 }
            );
          }
        }
      }
    } catch (e: any) {
      console.error('Error saving category image:', e?.message || e);
    }
    const { name, slug, description, isActive, image } = body;

    // Necesitamos el nombre ANTERIOR para poder migrar los productos que lo
    // referencian si el nombre cambia (products.category es texto libre, no
    // hay FK — sin esto, renombrar una categoría huérfana silenciosamente a
    // todos los productos que la usaban).
    const { data: existingCategory } = await supabaseServer
      .from('categories')
      .select('name')
      .eq('id', id)
      .maybeSingle();
    const oldName: string = existingCategory?.name ?? '';

    const normalizeSlug = (value: string) => value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    // Build update payload using existing columns
    const updatePayload: any = {};

    if (name !== undefined) {
      updatePayload.name = String(name).trim();
    }

    if (slug !== undefined) {
      updatePayload.slug = slug ? normalizeSlug(String(slug)) : null;
    }

    if (description !== undefined) {
      updatePayload.description = description || null;
    }

    if (image !== undefined) {
      updatePayload.image_url = image || null; // Use correct column name
    }

    if (isActive !== undefined) {
      updatePayload.is_active = Boolean(isActive); // Use correct column name  
    }

    // Note: updated_at is handled automatically by the DB trigger (trg_categories_set_updated_at)
    console.log("Updating category with payload:", updatePayload);

    const { data: updated, error } = await supabaseServer
      .from('categories')
      .update(updatePayload)
      .eq('id', id)
      .select('*')
      .maybeSingle();

    if (error) {
      console.error("Update error:", error);
      // Surface a clearer message for missing updated_at trigger issue
      const msg = (error as any)?.message || '';
      if (msg.includes('record "new" has no field "updated_at"') || msg.includes('updated_at')) {
        return NextResponse.json({
          error: 'La tabla categories tiene un trigger que requiere la columna updated_at. Agrega updated_at (y created_at opcionalmente) o elimina/ajusta el trigger.'
        }, { status: 500 });
      }
      throw error;
    }

    const catName = updated?.name ?? '';

    // Si el nombre cambió, migra products.category en los productos que
    // referenciaban el nombre anterior, para que no queden huérfanos.
    let cascadedCount = 0;
    if (oldName && catName && oldName.toLowerCase() !== catName.toLowerCase()) {
      const { data: affected, error: affectedErr } = await supabaseServer
        .from('products')
        .select('barcode, category')
        .not('category', 'is', null);
      if (!affectedErr && affected) {
        const toUpdate = affected.filter((p: any) => categoryTokenMatches(p.category, oldName));
        for (const p of toUpdate) {
          const nextCategory = replaceCategoryToken(p.category, oldName, catName);
          await supabaseServer.from('products').update({ category: nextCategory }).eq('barcode', p.barcode);
        }
        cascadedCount = toUpdate.length;
      }
    }

    const { data: productsData } = await supabase
      .from('products')
      .select('category');
    const count = (productsData || []).filter((p: any) => categoryTokenMatches(p.category, catName)).length;

    return NextResponse.json({
      id: String(updated?.id ?? id),
      name: updated?.name ?? '',
      slug: updated?.slug ?? (updated?.name ? slugify(String(updated.name)) : ''),
      description: updated?.description ?? null,
      image: updated?.image_url ?? null, // Map from image_url to image for API response
      isActive: updated?.is_active ?? true, // Map from is_active to isActive for API response
      cascadedProductsCount: cascadedCount,
      createdAt: updated?.created_at ?? updated?.createdAt ?? null,
      updatedAt: updated?.updated_at ?? updated?.updatedAt ?? null,
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    // Contar referencias en products.category (token exacto, no substring)
    const name = category.name ?? '';
    const { data: productsData } = await supabase
      .from('products')
      .select('category');
    const count = (productsData || []).filter((p: any) => categoryTokenMatches(p.category, name)).length;
    if (count > 0) {
      return NextResponse.json({ error: "No se puede eliminar una categoría con productos asociados" }, { status: 400 });
    }
    const { error: delErr } = await supabaseServer.from('categories').delete().eq('id', id);
    if (delErr) throw delErr;
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error deleting category" }, { status: 500 });
  }
}
