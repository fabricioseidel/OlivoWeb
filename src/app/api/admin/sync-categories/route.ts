import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase-server';
import { slugify, toTitleCase } from '@/utils/string-utils';

export async function POST(request: NextRequest) {
  // Solo admin
  const session: any = await getServerSession(authOptions as any);
  const role = (session as any)?.role || (session?.user as any)?.role || '';
  if (!session || !String(role).toUpperCase().includes('ADMIN')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  try {
    const { categories } = await request.json();

    if (!categories || !Array.isArray(categories)) {
      return NextResponse.json(
        { error: 'Se requiere un array de categorías' },
        { status: 400 }
      );
    }

    const createdCategories: any[] = [];

    // Comparar/insertar por nombre exacto (case-sensitive) creaba entradas
    // duplicadas en minúscula ("agua") separadas de una ya existente en
    // Title Case ("Agua"). Se normaliza el nombre a insertar y la
    // verificación de existencia es case-insensitive.
    const { data: existingCategories, error: existingErr } = await supabaseServer
      .from('categories')
      .select('name');
    if (existingErr) throw existingErr;
    const existingLower = new Set((existingCategories || []).map((c: any) => String(c.name).trim().toLowerCase()));

    for (const name of categories as string[]) {
      const trimmed = String(name).trim();
      if (!trimmed) continue;
      if (existingLower.has(trimmed.toLowerCase())) continue;

      const normalizedName = toTitleCase(trimmed);
      if (existingLower.has(normalizedName.toLowerCase())) continue;

      const payload = {
        name: normalizedName,
        slug: slugify(normalizedName),
        description: `Categoría ${normalizedName}`,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const { data: created, error: insErr } = await supabaseServer
        .from('categories')
        .insert(payload)
        .select('*')
        .maybeSingle();
      if (insErr) throw insErr;
      if (created) {
        createdCategories.push(created);
        existingLower.add(normalizedName.toLowerCase());
      }
    }

    return NextResponse.json({
      message: `Se crearon ${createdCategories.length} categorías`,
      createdCategories,
    });
  } catch (error) {
    console.error('Error al sincronizar categorías:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
