import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { uploadImageToSupabase } from "@/utils/supabaseStorage";

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
      slug: data.slug ?? (name ? String(name).toLowerCase().replace(/[^a-z0-9]+/gi, "-") : undefined),
      description: data.description ?? data.desc ?? null,
      image: data.image_url ?? null, // Use correct column name
      isActive: data.is_active ?? true, // Use correct column name
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { name, slug, description, isActive, image } = body;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const normalizeSlug = (value: string) => value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    // Build update payload using only existing columns (based on schema check: id, name, is_active, image_url)
    const updatePayload: any = {};

    if (name !== undefined) {
      updatePayload.name = String(name).trim();
    }

    if (image !== undefined) {
      updatePayload.image_url = image || null; // Use correct column name
    }

    if (isActive !== undefined) {
      updatePayload.is_active = Boolean(isActive); // Use correct column name  
    }

    // Note: slug and description columns don't exist in the actual table schema
    // Only include them if we confirm they exist
    console.log("Updating category with payload:", updatePayload);

    // Attempt to set updated_at if column exists; harmless if ignored by schema
    (updatePayload as any).updated_at = new Date().toISOString();

    const { data: updated, error } = await supabaseAdmin
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
    const { count } = await supabase
      .from('products')
      .select('barcode', { count: 'exact', head: true })
      .ilike('category', `%${catName}%`);

    return NextResponse.json({
      id: String(updated?.id ?? id),
      name: updated?.name ?? '',
      slug: updated?.slug ?? (updated?.name ? String(updated.name).toLowerCase().replace(/[^a-z0-9]+/gi, "-") : ''),
      description: updated?.description ?? null,
      image: updated?.image_url ?? null, // Map from image_url to image for API response
      isActive: updated?.is_active ?? true, // Map from is_active to isActive for API response
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
  } catch (_e) {
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
