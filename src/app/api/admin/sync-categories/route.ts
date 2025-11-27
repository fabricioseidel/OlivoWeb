import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

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

    const normalizeSlug = (value: string) => String(value)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    for (const name of categories as string[]) {
      const trimmed = String(name).trim();
      if (!trimmed) continue;
      // Existe?
  const { data: existing, error: findErr } = await supabaseAdmin
        .from('categories')
        .select('id')
        .eq('name', trimmed)
        .maybeSingle();
      if (findErr) throw findErr;
      if (!existing) {
        const payload = {
          name: trimmed,
          slug: normalizeSlug(trimmed),
          description: `Categoría ${trimmed}`,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
  const { data: created, error: insErr } = await supabaseAdmin
          .from('categories')
          .insert(payload)
          .select('*')
          .maybeSingle();
        if (insErr) throw insErr;
        if (created) createdCategories.push(created);
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
